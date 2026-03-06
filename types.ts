
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
export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
