
import { GoogleGenAI } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';
import type { ModelType, ImageSize, AspectRatio, ApiResponse } from '../types';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const getTramProxyBase = (): string => {
    const envVal = (import.meta as any)?.env?.VITE_TRAM_PROXY_BASE;
    if (typeof envVal === 'string' && envVal.trim()) {
        return envVal.trim().replace(/\/+$/, '');
    }

    try {
        const v = localStorage.getItem('TRAM_PROXY_BASE');
        return typeof v === 'string' && v.trim() ? v.trim().replace(/\/+$/, '') : '';
    } catch {
        return '';
    }
};

const isOverloaded503 = (error: unknown) => {
    const e = error as any;
    const msg = typeof e?.message === 'string' ? e.message : '';
    const status = typeof e?.status === 'string' ? e.status : '';
    const code = typeof e?.code === 'number' ? e.code : undefined;

    return (
        code === 503 ||
        status === 'UNAVAILABLE' ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('"code":503')
    );
};

/**
 * Chuyển đổi base64 thành Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function fetchAsDataUrl(url: string): Promise<string> {
    const isDev = !!import.meta.env?.DEV;
    const proxyBase = getTramProxyBase();
    const rewrittenUrl = proxyBase
        ? `${proxyBase}/proxy?url=${encodeURIComponent(url)}`
        : isDev
            ? url.startsWith('https://api.tramsangtao.com')
                ? url.replace('https://api.tramsangtao.com', '/api-tramsangtao')
                : url.startsWith('https://cdn.tramsangtao.com')
                    ? url.replace('https://cdn.tramsangtao.com', '/cdn-tramsangtao')
                    : url.startsWith('https://storage.googleapis.com/')
                        ? url.replace('https://storage.googleapis.com', '/gcs')
                        : url
            : url;

    const res = await fetch(rewrittenUrl);
    if (!res.ok) throw new Error(`Download result failed: ${res.status}`);
    const blob = await res.blob();
    return blobToDataUrl(blob);
}

/**
 * Gọi API tramsangtao.com để tạo ảnh
 */
async function generateWithNanoBanana(
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    aspectRatio: AspectRatio = '16:9',
    imageSize: ImageSize = '2k',
    model: 'nano-banana' | 'nano-banana-pro' = 'nano-banana'
): Promise<string> {
    const isDev = !!import.meta.env?.DEV;
    const proxyBase = getTramProxyBase();
    const endpoint = proxyBase
        ? `${proxyBase}/v1/image/generate`
        : isDev
            ? '/api-tramsangtao/v1/image/generate'
            : 'https://api.tramsangtao.com/v1/image/generate';
    const hasInputImage = !!base64ImageData;

    let response: Response;
    try {
        response = hasInputImage
            ? await (async () => {
                const formData = new FormData();
                formData.append('prompt', prompt);
                formData.append('model', model);
                if (model === 'nano-banana-pro') {
                    formData.append('resolution', imageSize);
                }
                formData.append('aspect_ratio', aspectRatio);
                formData.append('speed', 'fast');

                const blob = base64ToBlob(base64ImageData, mimeType);
                formData.append('input_image', blob, `input.${mimeType.split('/')[1]}`);

                return fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: formData
                });
            })()
            : await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    model,
                    aspect_ratio: aspectRatio,
                    speed: 'fast',
                    ...(model === 'nano-banana-pro' ? { resolution: imageSize } : {}),
                })
            });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!isDev && !proxyBase) {
            throw new Error(`Failed to fetch. Trình duyệt đang chặn CORS khi gọi api.tramsangtao.com từ GitHub Pages. Hãy cấu hình Proxy URL (Cloudflare Worker) rồi thử lại. (${msg})`);
        }
        throw err;
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    const immediateResult = (data as any).result_url ?? (data as any).result;
    if (typeof immediateResult === 'string' && immediateResult) {
        const dataUrl = await fetchAsDataUrl(immediateResult);
        return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    }

    return pollJobResult(apiKey, data.job_id);
}

async function pollJobResult(apiKey: string, jobId: string): Promise<string> {
    const maxAttempts = 60;
    const isDev = !!import.meta.env?.DEV;
    const proxyBase = getTramProxyBase();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const url = proxyBase
            ? `${proxyBase}/v1/jobs/${encodeURIComponent(jobId)}`
            : isDev
                ? `/api-tramsangtao/v1/jobs/${encodeURIComponent(jobId)}`
                : `https://api.tramsangtao.com/v1/jobs/${encodeURIComponent(jobId)}`;
        let response: Response;
        try {
            response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!isDev && !proxyBase) {
                throw new Error(`Failed to fetch. Trình duyệt đang chặn CORS khi gọi api.tramsangtao.com từ GitHub Pages. Hãy cấu hình Proxy URL (Cloudflare Worker) rồi thử lại. (${msg})`);
            }
            throw err;
        }

        if (response.status === 404) {
            await sleep(2000);
            continue;
        }

        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }

        const payload = await response.json().catch(() => ({}));
        const status = typeof payload?.status === 'string' ? payload.status.toLowerCase() : '';
        const result = payload?.result;

        if (status === 'completed') {
            if (typeof result !== 'string' || !result) {
                throw new Error('Job completed but result is missing.');
            }
            const dataUrl = await fetchAsDataUrl(result);
            return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        }

        if (status === 'failed' || status === 'error') {
            throw new Error('Image generation failed on server.');
        }

        await sleep(5000);
    }

    throw new Error('Job timeout.');
}

export async function generateInpaintedImage(
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    isInpainting: boolean,
    referenceImages: { base64: string; mimeType: string }[] = [],
    model: ModelType = 'gemini-2.5-flash-image',
    aspectRatio: AspectRatio = '1:1',
    imageSize: ImageSize = '1k'
): Promise<string> {
    // Nếu sử dụng model mới nano-banana hoặc nano-banana-pro
    if (model === 'nano-banana-pro' || model === 'nano-banana') {
        return generateWithNanoBanana(apiKey, base64ImageData, mimeType, prompt, aspectRatio, imageSize, model);
    }

    // Logic cũ cho Gemini
    try {
        const ai = new GoogleGenAI({ apiKey });

        const allImages = [
            {
                inlineData: {
                    data: base64ImageData,
                    mimeType: mimeType,
                },
            },
            ...referenceImages.map(ref => ({
                inlineData: {
                    data: ref.base64,
                    mimeType: ref.mimeType
                }
            }))
        ];

        allImages.reverse();
        const inputImageIndex = allImages.length;

        let refImageInstruction = "";
        if (referenceImages.length > 0) {
             const refIndices = Array.from({length: referenceImages.length}, (_, i) => i + 1).join(', ');
             refImageInstruction = ` Reference image(s) provided as Image ${refIndices}.`;
        }

        const textPrompt = isInpainting
            ? `Image ${inputImageIndex} is the input. I have highlighted an area with a colored mask. Replace only this masked area with: "${prompt}". Blending must be seamless.${refImageInstruction}`
            : `Generate a new image based on: "${prompt}". Filling the frame.${refImageInstruction}`;

        const config: any = {
            imageConfig: {
                aspectRatio: aspectRatio,
            }
        };

        // Only Pro supports imageSize
        if (model === 'gemini-3-pro-image-preview') {
            config.imageConfig.imageSize = imageSize.toUpperCase() as any;
        }

        const request = {
            model: model,
            contents: {
                parts: [
                    ...allImages,
                    { text: textPrompt },
                ],
            },
            config: config,
        };

        const maxRetries = model === 'gemini-3-pro-image-preview' && imageSize === '4k' ? 1 : 3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response: GenerateContentResponse = await ai.models.generateContent(request);

                const candidate = response.candidates?.[0];
                if (!candidate) {
                    throw new Error('No image was generated. Check safety policies.');
                }

                for (const part of candidate.content?.parts || []) {
                    if (part.inlineData?.data) {
                        return part.inlineData.data;
                    }
                }

                throw new Error('No image data found in response.');
            } catch (error) {
                if (!isOverloaded503(error) || attempt === maxRetries) {
                    throw error;
                }

                const base = 600;
                const backoff = Math.min(8000, base * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 250);
                await sleep(backoff + jitter);
            }
        }

        throw new Error('Generation failed after retries.');

    } catch (error) {
        if (!isOverloaded503(error)) {
            console.error("Gemini API Error:", error);
        }
        throw error;
    }
}

export async function enhancePrompt(
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    userHint: string
): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const model = 'gemini-3-flash-preview';

        const systemInstruction = `You are an expert prompt engineer. Improve the user's hint for AI image generation. Return ONLY the enhanced prompt.`;
        
        const request = {
            model,
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: userHint || 'Describe this area.' },
                ],
            },
            config: {
                systemInstruction: systemInstruction,
            }
        };

        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await ai.models.generateContent(request);
                return response.text?.trim() || userHint;
            } catch (error) {
                if (!isOverloaded503(error) || attempt === maxRetries) {
                    return userHint;
                }

                const base = 400;
                const backoff = Math.min(4000, base * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 250);
                await sleep(backoff + jitter);
            }
        }

        return userHint;
    } catch (error) {
        return userHint;
    }
}
