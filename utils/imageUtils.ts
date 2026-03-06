
import type { MaskData, BoundingBox, FocusData, StitchMethod, AspectRatio } from '../types';

const BASE_SIZE = 1024; // Standard base size for uploading context to Gemini

const ASPECT_RATIO_MAP: { label: AspectRatio, ratio: number }[] = [
    { label: '1:1', ratio: 1 },
    { label: '3:4', ratio: 3 / 4 },
    { label: '4:3', ratio: 4 / 3 },
    { label: '9:16', ratio: 9 / 16 },
    { label: '16:9', ratio: 16 / 9 },
];

export function findClosestAspectRatio(width: number, height: number): AspectRatio {
    const targetRatio = width / height;
    let closest = ASPECT_RATIO_MAP[0];
    let minDiff = Math.abs(targetRatio - closest.ratio);

    for (let i = 1; i < ASPECT_RATIO_MAP.length; i++) {
        const diff = Math.abs(targetRatio - ASPECT_RATIO_MAP[i].ratio);
        if (diff < minDiff) {
            minDiff = diff;
            closest = ASPECT_RATIO_MAP[i];
        }
    }
    return closest.label;
}

function getMaskBoundingBox(maskCanvas: HTMLCanvasElement): BoundingBox | null {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0;
    let hasMask = false;

    for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
            const alpha = data[(y * maskCanvas.width + x) * 4 + 3];
            if (alpha > 0) {
                hasMask = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (!hasMask) return null;

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function expandBoundingBox(box: BoundingBox, imgWidth: number, imgHeight: number, factor: number = 1.2): BoundingBox {
    let newWidth = box.width * factor;
    let newHeight = box.height * factor;

    let newMinX = box.minX - (newWidth - box.width) / 2;
    let newMinY = box.minY - (newHeight - box.height) / 2;

    newMinX = Math.max(0, newMinX);
    newMinY = Math.max(0, newMinY);

    let newMaxX = newMinX + newWidth;
    let newMaxY = newMinY + newHeight;

    if (newMaxX > imgWidth) {
        newMaxX = imgWidth;
        newMinX = Math.max(0, newMaxX - newWidth);
    }
    if (newMaxY > imgHeight) {
        newMaxY = imgHeight;
        newMinY = Math.max(0, newMaxY - newHeight);
    }
    
    newWidth = newMaxX - newMinX;
    newHeight = newMaxY - newMinY;

    return { minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY, width: newWidth, height: newHeight };
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function prepareImageForGemini(
    imageFile: File,
    maskData: MaskData | null,
    userDefinedBox: BoundingBox | null | undefined,
    maskOpacity: number,
): Promise<{ preparedImageBase64: string, mimeType: string, focusData: FocusData, aspectRatio: AspectRatio }> {

    const originalImage = await fileToImage(imageFile);
    const { width: originalWidth, height: originalHeight } = originalImage;
    const hasMask = !!maskData?.hasDrawing;

    let initialBox: BoundingBox;

    if (userDefinedBox && userDefinedBox.width > 0 && userDefinedBox.height > 0) {
        initialBox = userDefinedBox;
    } else if (hasMask) {
        const calculatedBox = getMaskBoundingBox(maskData.maskCanvas);
        if (!calculatedBox) {
            throw new Error("Could not determine area from the mask.");
        }
        initialBox = expandBoundingBox(calculatedBox, originalWidth, originalHeight, 1.1);
    } else {
        initialBox = { minX: 0, minY: 0, maxX: originalWidth, maxY: originalHeight, width: originalWidth, height: originalHeight };
    }

    const aspectRatioLabel = findClosestAspectRatio(initialBox.width, initialBox.height);
    const targetRatio = ASPECT_RATIO_MAP.find(m => m.label === aspectRatioLabel)!.ratio;
    
    let adjustedWidth = initialBox.width;
    let adjustedHeight = initialBox.height;
    const currentAspectRatio = initialBox.width / initialBox.height;

    if (currentAspectRatio > targetRatio) {
        adjustedHeight = initialBox.width / targetRatio;
    } else {
        adjustedWidth = initialBox.height * targetRatio;
    }

    let newMinX = initialBox.minX - (adjustedWidth - initialBox.width) / 2;
    let newMinY = initialBox.minY - (adjustedHeight - initialBox.height) / 2;
    
    if (newMinX < 0) newMinX = 0;
    if (newMinY < 0) newMinY = 0;
    if (newMinX + adjustedWidth > originalWidth) newMinX = originalWidth - adjustedWidth;
    if (newMinY + adjustedHeight > originalHeight) newMinY = originalHeight - adjustedHeight;

    const finalBox: BoundingBox = {
        minX: Math.max(0, newMinX),
        minY: Math.max(0, newMinY),
        maxX: Math.min(originalWidth, newMinX + adjustedWidth),
        maxY: Math.min(originalHeight, newMinY + adjustedHeight),
        width: Math.min(originalWidth, adjustedWidth),
        height: Math.min(originalHeight, adjustedHeight),
    };

    const focusData: FocusData = { box: finalBox, originalWidth, originalHeight };
    
    const focusedCanvas = document.createElement('canvas');
    focusedCanvas.width = finalBox.width;
    focusedCanvas.height = finalBox.height;
    const focusedCtx = focusedCanvas.getContext('2d');
    if (!focusedCtx) throw new Error("Could not get canvas context");

    focusedCtx.drawImage(originalImage, finalBox.minX, finalBox.minY, finalBox.width, finalBox.height, 0, 0, finalBox.width, finalBox.height);

    if (hasMask) {
        focusedCtx.globalAlpha = maskOpacity;
        focusedCtx.drawImage(maskData.maskCanvas, finalBox.minX, finalBox.minY, finalBox.width, finalBox.height, 0, 0, finalBox.width, finalBox.height);
        focusedCtx.globalAlpha = 1.0;
    }

    const resizedCanvas = document.createElement('canvas');
    const aspect = finalBox.width / finalBox.height;
    
    if (aspect > 1) {
        resizedCanvas.width = BASE_SIZE;
        resizedCanvas.height = BASE_SIZE / aspect;
    } else {
        resizedCanvas.height = BASE_SIZE;
        resizedCanvas.width = BASE_SIZE * aspect;
    }

    const resizedCtx = resizedCanvas.getContext('2d');
    if (!resizedCtx) throw new Error("Could not get canvas context for resizing");

    resizedCtx.drawImage(focusedCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
    
    const mimeType = 'image/png';
    const base64 = resizedCanvas.toDataURL(mimeType).split(',')[1];
    
    return { preparedImageBase64: base64, mimeType, focusData, aspectRatio: aspectRatioLabel };
}

function expandBoxByPercent(box: BoundingBox, percent: number, imgWidth: number, imgHeight: number): BoundingBox {
    const widthIncrease = box.width * (percent / 100);
    const heightIncrease = box.height * (percent / 100);

    let newMinX = box.minX - widthIncrease / 2;
    let newMinY = box.minY - heightIncrease / 2;
    let newMaxX = box.maxX + widthIncrease / 2;
    let newMaxY = box.maxY + heightIncrease / 2;

    newMinX = Math.max(0, newMinX);
    newMinY = Math.max(0, newMinY);
    newMaxX = Math.min(imgWidth, newMaxX);
    newMaxY = Math.min(imgHeight, newMaxY);
    
    return {
        minX: newMinX,
        minY: newMinY,
        maxX: newMaxX,
        maxY: newMaxY,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY,
    };
}


export async function stitchImage(
    originalImageFile: File,
    generatedImageBase64: string,
    focusData: FocusData,
    maskData: MaskData | null,
    stitchMethod: StitchMethod,
    expansion: number,
    blur: number,
    focusMaskData?: MaskData | null // New parameter
): Promise<File> {
    const originalImage = await fileToImage(originalImageFile);
    const generatedImage = new Image();
    generatedImage.src = `data:image/png;base64,${generatedImageBase64}`;
    await new Promise((resolve, reject) => {
        generatedImage.onload = resolve;
        generatedImage.onerror = reject;
    });

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = focusData.originalWidth;
    finalCanvas.height = focusData.originalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error("Could not get final canvas context");
    
    finalCtx.drawImage(originalImage, 0, 0);

    const genCanvas = document.createElement('canvas');
    genCanvas.width = focusData.originalWidth;
    genCanvas.height = focusData.originalHeight;
    const genCtx = genCanvas.getContext('2d');
    if (!genCtx) throw new Error("Could not get gen canvas context");

    genCtx.drawImage(generatedImage, focusData.box.minX, focusData.box.minY, focusData.box.width, focusData.box.height);
    
    const baseMask = document.createElement('canvas');
    baseMask.width = focusData.originalWidth;
    baseMask.height = focusData.originalHeight;
    const bmCtx = baseMask.getContext('2d');
    if (!bmCtx) throw new Error("Could not get base mask context");

    // Prioritize focus mask if it exists and we're in 'mask' mode
    const hasFocusMask = !!focusMaskData?.hasDrawing;
    const hasOriginalMask = !!maskData?.hasDrawing;
    const effectiveStitchMethod = (hasFocusMask || hasOriginalMask) ? stitchMethod : 'boundingBox';

    if (effectiveStitchMethod === 'boundingBox') {
        const boxToUse = focusData.box;
        if (boxToUse) {
            const expandedBox = expandBoxByPercent(boxToUse, expansion, focusData.originalWidth, focusData.originalHeight);
            bmCtx.fillStyle = 'black';
            bmCtx.fillRect(expandedBox.minX, expandedBox.minY, expandedBox.width, expandedBox.height);
        }
    } else {
        if (expansion > 0) {
            bmCtx.shadowColor = 'black';
            bmCtx.shadowBlur = expansion;
        }
        
        if (hasFocusMask) {
            // Draw focus-relative mask at correct world position
            bmCtx.drawImage(focusMaskData.maskCanvas, focusData.box.minX, focusData.box.minY, focusData.box.width, focusData.box.height);
        } else if (hasOriginalMask) {
            bmCtx.drawImage(maskData.maskCanvas, 0, 0);
        }
    }
    
    const featheredMask = document.createElement('canvas');
    featheredMask.width = focusData.originalWidth;
    featheredMask.height = focusData.originalHeight;
    const fmCtx = featheredMask.getContext('2d');
    if (!fmCtx) throw new Error("Could not get feathered mask context");
    if (blur > 0) {
        fmCtx.filter = `blur(${blur}px)`;
    }
    fmCtx.drawImage(baseMask, 0, 0);
    fmCtx.filter = 'none';

    genCtx.globalCompositeOperation = 'destination-in';
    genCtx.drawImage(featheredMask, 0, 0);
    
    finalCtx.drawImage(genCanvas, 0, 0);

    return new Promise((resolve, reject) => {
        finalCanvas.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File([blob], `inpainted-result-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    resolve(file);
                } else {
                    reject(new Error('Failed to convert canvas to Blob.'));
                }
            },
            'image/jpeg',
            0.95
        );
    });
}
