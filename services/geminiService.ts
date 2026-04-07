
import { GoogleGenAI, Modality } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';
import type { ModelType, ImageSize, AspectRatio } from '../types';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

export async function generateInpaintedImage(
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    isInpainting: boolean,
    referenceImages: { base64: string; mimeType: string }[] = [],
    model: ModelType = 'gemini-2.5-flash-image',
    aspectRatio: AspectRatio = '1:1',
    imageSize: ImageSize = '1K'
): Promise<string> {
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
            config.imageConfig.imageSize = imageSize;
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

        const maxRetries = model === 'gemini-3-pro-image-preview' && imageSize === '4K' ? 1 : 3;
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
