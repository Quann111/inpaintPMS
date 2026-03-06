
import { GoogleGenAI, Modality } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';
import type { ModelType, ImageSize, AspectRatio } from '../types';

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

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    ...allImages,
                    { text: textPrompt },
                ],
            },
            config: config,
        });

        const candidate = response.candidates?.[0];
        
        if (!candidate) {
            throw new Error("No image was generated. Check safety policies.");
        }

        for (const part of candidate.content?.parts || []) {
            if (part.inlineData?.data) {
                return part.inlineData.data;
            }
        }
        
        throw new Error("No image data found in response.");

    } catch (error) {
        console.error("Gemini API Error:", error);
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
        
        const response = await ai.models.generateContent({
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
        });

        return response.text?.trim() || userHint;
    } catch (error) {
        return userHint;
    }
}
