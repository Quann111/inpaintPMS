
export interface MaskData {
    maskCanvas: HTMLCanvasElement;
    hasDrawing: boolean;
}

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export interface FocusData {
    box: BoundingBox;
    originalWidth: number;
    originalHeight: number;
}

export type StitchMethod = 'mask' | 'boundingBox';

export type BrushMode = 'draw' | 'erase';

// Added missing exported types for model configuration, image size, and aspect ratios
export type ModelType = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
export type ImageSize = '1k' | '2k' | '4k';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '16:9' | '21:9' | '5:4' | '3:2' | '2:3' | '9:16' | '3:4' | '4:5';

export interface ApiResponse {
    job_id: string;
    status: string;
    cost: number;
    balance_remaining: number;
    result_url?: string; // Giả định API sẽ trả về URL kết quả sau khi hoàn thành
}

declare global {
    interface Window {
        aistudio?: {
            openSelectKey: () => Promise<void>;
            hasSelectedApiKey: () => Promise<boolean>;
        };
    }
}
