
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MaskData, BoundingBox, BrushMode } from '../types';
import { UploadIcon, ClipboardIcon } from './icons';

interface ImageEditorProps {
    image: File | null;
    imageUrl?: string | null; // Added support for direct URL
    onImageUpload: (file: File) => void;
    onDrawEnd: (canvas: HTMLCanvasElement) => void;
    brushSize: number;
    maskData: MaskData | null;
    isDrawingBoxMode: boolean;
    userDefinedBox: BoundingBox | null;
    onBoxChange: (box: BoundingBox, isFinal?: boolean) => void;
    onDrawingBoxChange: (box: BoundingBox | null) => void;
    brushMode: BrushMode;
    brushColor: string;
    maskOpacity: number;
    showMaskOverlay: boolean;
    isBrushModeActive: boolean;
    fullscreen?: boolean;
    fullscreenSize?: { width: number, height: number };
    transform?: { scale: number; offset: { x: number; y: number } };
}

type Interaction = {
    type: 'move' | 'resize';
    handle: string;
    startBox: BoundingBox;
    startPos: { x: number; y: number };
}


export const ImageEditor: React.FC<ImageEditorProps> = ({ 
    image,
    imageUrl: directImageUrl,
    onImageUpload,
    onDrawEnd, 
    brushSize, 
    maskData,
    isDrawingBoxMode,
    userDefinedBox,
    onBoxChange,
    onDrawingBoxChange,
    brushMode,
    brushColor,
    maskOpacity,
    showMaskOverlay,
    isBrushModeActive,
    fullscreen = false,
    fullscreenSize,
    transform
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [boxDrawStart, setBoxDrawStart] = useState<{x: number, y: number} | null>(null);
    const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    // State for moving/resizing the focus box
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (image || directImageUrl) return;

            const items = event.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        event.preventDefault();
                        onImageUpload(file);
                        return;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [image, directImageUrl, onImageUpload]);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        if (fullscreen) {
            ctx.fillStyle = '#1e293b'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    
        ctx.save();
        if (transform) {
            ctx.translate(transform.offset.x, transform.offset.y);
            ctx.scale(transform.scale, transform.scale);
        }
    
        if (imageRef.current && imageRef.current.complete) {
            ctx.drawImage(imageRef.current, 0, 0, dimensions.width, dimensions.height);
        }
    
        if (userDefinedBox) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, dimensions.width, dimensions.height);
            ctx.rect(userDefinedBox.minX, userDefinedBox.minY, userDefinedBox.width, userDefinedBox.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill('evenodd');
            ctx.restore();
        }
    
        if (showMaskOverlay && maskCanvasRef.current) {
            ctx.globalAlpha = maskOpacity;
            ctx.drawImage(maskCanvasRef.current, 0, 0, dimensions.width, dimensions.height);
            ctx.globalAlpha = 1.0;
        }
    
        const boxToDraw = currentBox || userDefinedBox;
        if (boxToDraw) {
            const effectiveScale = transform?.scale ?? 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2 / effectiveScale;
            ctx.setLineDash([6 / effectiveScale, 4 / effectiveScale]);
            ctx.strokeRect(boxToDraw.minX, boxToDraw.minY, boxToDraw.width, boxToDraw.height);
            ctx.setLineDash([]);
    
            const handleSize = 8 / effectiveScale;
            const handles = [
                [boxToDraw.minX, boxToDraw.minY], [boxToDraw.maxX, boxToDraw.minY],
                [boxToDraw.minX, boxToDraw.maxY], [boxToDraw.maxX, boxToDraw.maxY],
                [boxToDraw.minX + boxToDraw.width / 2, boxToDraw.minY],
                [boxToDraw.minX + boxToDraw.width / 2, boxToDraw.maxY],
                [boxToDraw.minX, boxToDraw.minY + boxToDraw.height / 2],
                [boxToDraw.maxX, boxToDraw.minY + boxToDraw.height / 2],
            ];
    
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 1 / effectiveScale;
            handles.forEach(([x, y]) => {
                ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
            });
        }
    
        if (mousePos && isBrushModeActive && !isDrawingBoxMode && !interaction) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2 / (transform?.scale ?? 1);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / (transform?.scale ?? 1);
            ctx.stroke();
            ctx.restore();
        }
    
        ctx.restore(); 
        ctx.restore(); 
    }, [currentBox, userDefinedBox, maskOpacity, dimensions, transform, showMaskOverlay, mousePos, isBrushModeActive, isDrawingBoxMode, brushSize, fullscreen, interaction]);
    
    useEffect(() => {
        if (image) {
            const url = URL.createObjectURL(image);
            setImageUrl(url);
            const img = new Image();
            img.onload = () => setDimensions({ width: img.width, height: img.height });
            img.src = url;
        } else if (directImageUrl) {
            setImageUrl(directImageUrl);
            const img = new Image();
            img.onload = () => setDimensions({ width: img.width, height: img.height });
            img.src = directImageUrl;
        } else {
            setImageUrl(null);
            setDimensions({ width: 0, height: 0 });
        }
        maskCanvasRef.current = null;
        setCurrentBox(null);
        setBoxDrawStart(null);
    }, [image, directImageUrl]);

    useEffect(() => {
        return () => { if (imageUrl && !directImageUrl) URL.revokeObjectURL(imageUrl); };
    }, [imageUrl, directImageUrl]);

    useEffect(() => {
        if (maskData?.maskCanvas) {
            maskCanvasRef.current = maskData.maskCanvas;
        } else if (dimensions.width > 0 && dimensions.height > 0) {
            // Ensure mask canvas is initialized even if null
            if (!maskCanvasRef.current) {
                maskCanvasRef.current = document.createElement('canvas');
                maskCanvasRef.current.width = dimensions.width;
                maskCanvasRef.current.height = dimensions.height;
            } else if (maskCanvasRef.current.width !== dimensions.width) {
                 maskCanvasRef.current.width = dimensions.width;
                 maskCanvasRef.current.height = dimensions.height;
            }
        }
        redrawCanvas();
    }, [maskData, redrawCanvas, dimensions]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (fullscreen && fullscreenSize && fullscreenSize.width > 0 && fullscreenSize.height > 0) {
            canvas.width = fullscreenSize.width;
            canvas.height = fullscreenSize.height;
        } else if (dimensions.width > 0) {
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;
        }
        redrawCanvas();
    }, [dimensions, redrawCanvas, fullscreen, fullscreenSize]);

    const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (transform) {
            const worldX = (mouseX - transform.offset.x) / transform.scale;
            const worldY = (mouseY - transform.offset.y) / transform.scale;
            return { x: worldX, y: worldY };
        } else {
            return {
                x: mouseX * (canvas.width / rect.width),
                y: mouseY * (canvas.height / rect.height),
            };
        }
    }, [transform]);

    const getHandleAtPosition = useCallback((pos: { x: number; y: number }, box: BoundingBox, scale: number): string | null => {
        const handleSize = 12 / scale;
        const halfHandle = handleSize / 2;

        const handles = {
            tl: { x: box.minX, y: box.minY }, tr: { x: box.maxX, y: box.minY },
            bl: { x: box.minX, y: box.maxY }, br: { x: box.maxX, y: box.maxY },
            t: { x: box.minX + box.width / 2, y: box.minY }, b: { x: box.minX + box.width / 2, y: box.maxY },
            l: { x: box.minX, y: box.minY + box.height / 2 }, r: { x: box.maxX, y: box.minY + box.height / 2 },
        };

        for (const [key, handlePos] of Object.entries(handles)) {
            if ( pos.x >= handlePos.x - halfHandle && pos.x <= handlePos.x + halfHandle && pos.y >= handlePos.y - halfHandle && pos.y <= handlePos.y + halfHandle ) {
                return key;
            }
        }

        if (pos.x > box.minX && pos.x < box.maxX && pos.y > box.minY && pos.y < box.maxY) {
            return 'body';
        }

        return null;
    }, []);
    
    const stopDrawing = useCallback(() => {
        if (boxDrawStart && currentBox && currentBox.width > 5 && currentBox.height > 5) {
            onBoxChange(currentBox, true);
        }
        setBoxDrawStart(null);
        setCurrentBox(null);
        onDrawingBoxChange(null);
        
        if (isDrawing) {
            setIsDrawing(false);
            lastPoint.current = null;
            if (maskCanvasRef.current) {
                onDrawEnd(maskCanvasRef.current);
            }
        }
    }, [boxDrawStart, currentBox, onBoxChange, onDrawingBoxChange, isDrawing, onDrawEnd]);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
             if (interaction) {
                const { type, handle, startBox, startPos } = interaction;
                const pos = getMousePos(e);
                const dx = pos.x - startPos.x;
                const dy = pos.y - startPos.y;
                
                let { minX, minY, maxX, maxY } = startBox;

                if (type === 'move') {
                    let newMinX = startBox.minX + dx;
                    let newMinY = startBox.minY + dy;
                    if (newMinX < 0) newMinX = 0;
                    if (newMinY < 0) newMinY = 0;
                    if (newMinX + startBox.width > dimensions.width) newMinX = dimensions.width - startBox.width;
                    if (newMinY + startBox.height > dimensions.height) newMinY = dimensions.height - startBox.height;
                    minX = newMinX;
                    maxX = newMinX + startBox.width;
                    minY = newMinY;
                    maxY = newMinY + startBox.height;
                } else { 
                    if (handle.includes('l')) minX += dx;
                    if (handle.includes('r')) maxX += dx;
                    if (handle.includes('t')) minY += dy;
                    if (handle.includes('b')) maxY += dy;
                }

                if (minX > maxX) [minX, maxX] = [maxX, minX];
                if (minY > maxY) [minY, maxY] = [maxY, minY];

                minX = Math.max(0, minX);
                minY = Math.max(0, minY);
                maxX = Math.min(dimensions.width, maxX);
                maxY = Math.min(dimensions.height, maxY);

                const newBox: BoundingBox = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
                onBoxChange(newBox, false);
                return;
            }


            if (!isDrawing && !boxDrawStart) return;

            const pos = getMousePos(e);
            const clampedX = Math.max(0, Math.min(pos.x, dimensions.width));
            const clampedY = Math.max(0, Math.min(pos.y, dimensions.height));
            const currentPos = { x: clampedX, y: clampedY };


            if (boxDrawStart) {
                const minX = Math.min(boxDrawStart.x, clampedX);
                const minY = Math.min(boxDrawStart.y, clampedY);
                const maxX = Math.max(boxDrawStart.x, clampedX);
                const maxY = Math.max(boxDrawStart.y, clampedY);
                const newBox = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
                setCurrentBox(newBox);
                onDrawingBoxChange(newBox);
            } else {
                if (!isDrawing || !imageUrl || !maskCanvasRef.current || !lastPoint.current) return;
                const maskCtx = maskCanvasRef.current.getContext('2d');
                if (!maskCtx) return;

                if (brushMode === 'erase') {
                    maskCtx.globalCompositeOperation = 'destination-out';
                    maskCtx.fillStyle = 'rgba(0,0,0,1)';
                } else {
                    maskCtx.globalCompositeOperation = 'source-over';
                    maskCtx.fillStyle = brushColor;
                }

                const dist = Math.hypot(currentPos.x - lastPoint.current.x, currentPos.y - lastPoint.current.y);
                const angle = Math.atan2(currentPos.y - lastPoint.current.y, currentPos.x - lastPoint.current.x);
                
                for (let i = 0; i < dist; i += 2) {
                    const x = lastPoint.current.x + (Math.cos(angle) * i);
                    const y = lastPoint.current.y + (Math.sin(angle) * i);
                    maskCtx.beginPath();
                    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
                    maskCtx.fill();
                }

                maskCtx.globalCompositeOperation = 'source-over';
                lastPoint.current = currentPos;
                redrawCanvas();
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (interaction) setInteraction(null);
            stopDrawing();
        };

        if (isDrawing || boxDrawStart || interaction) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDrawing, boxDrawStart, interaction, getMousePos, stopDrawing, dimensions.width, dimensions.height, onDrawingBoxChange, imageUrl, brushMode, brushColor, brushSize, redrawCanvas, onBoxChange]);


    const startInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!imageUrl) return;
        const pos = getMousePos(e);

        if (!isBrushModeActive && userDefinedBox) {
            const handle = getHandleAtPosition(pos, userDefinedBox, transform?.scale ?? 1);
            if (handle) {
                setInteraction({
                    type: handle === 'body' ? 'move' : 'resize',
                    handle: handle,
                    startBox: userDefinedBox,
                    startPos: pos,
                });
                return;
            }
        }

        if (isDrawingBoxMode) {
            setBoxDrawStart(pos);
            setCurrentBox(null);
            onDrawingBoxChange(null);
            return;
        } 
        
        if (isBrushModeActive) {
            setIsDrawing(true);
            
            if (!maskCanvasRef.current) {
                maskCanvasRef.current = document.createElement('canvas');
                maskCanvasRef.current.width = dimensions.width;
                maskCanvasRef.current.height = dimensions.height;
            }
            
            lastPoint.current = pos;
            const maskCtx = maskCanvasRef.current.getContext('2d');
            if (!maskCtx) return;

            if (brushMode === 'erase') {
                maskCtx.globalCompositeOperation = 'destination-out';
                maskCtx.fillStyle = 'rgba(0,0,0,1)';
            } else {
                maskCtx.globalCompositeOperation = 'source-over';
                maskCtx.fillStyle = brushColor;
            }
            maskCtx.beginPath();
            maskCtx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
            maskCtx.fill();
            maskCtx.globalCompositeOperation = 'source-over';
            redrawCanvas();
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!directImageUrl) setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                onImageUpload(file);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
        }
    };
    
    const handlePlaceholderClick = () => {
        if (!directImageUrl) fileInputRef.current?.click();
    };

    const getCursorClass = () => {
        if (!imageUrl) return 'cursor-pointer';
        if (isBrushModeActive) return 'cursor-none';
        
        if (hoveredHandle) {
             switch (hoveredHandle) {
                case 'body': return 'cursor-move';
                case 'tl': case 'br': return 'cursor-nwse-resize';
                case 'tr': case 'bl': return 'cursor-nesw-resize';
                case 't': case 'b': return 'cursor-ns-resize';
                case 'l': case 'r': return 'cursor-ew-resize';
            }
        }
        if (isDrawingBoxMode) return 'cursor-crosshair';
        return 'cursor-grab';
    };
    
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        setMousePos(pos);
        if (!isBrushModeActive && userDefinedBox && !interaction && !boxDrawStart && !isDrawing) {
            const handle = getHandleAtPosition(pos, userDefinedBox, transform?.scale ?? 1);
            setHoveredHandle(handle);
        } else if (!interaction) {
            setHoveredHandle(null);
        }
    };
    
    return (
        <div 
            className={`relative flex justify-center items-center bg-slate-900/50 rounded-lg overflow-hidden transition-all duration-300 min-h-[300px] ${fullscreen ? 'w-full h-full' : 'w-full aspect-video'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDraggingOver && (
                <div className="absolute inset-0 bg-cyan-500/30 border-4 border-dashed border-cyan-400 rounded-lg flex items-center justify-center pointer-events-none z-10">
                    <p className="text-xl font-bold text-white drop-shadow-lg">Drop image here</p>
                </div>
            )}
            {imageUrl ? (
                <>
                    <img ref={imageRef} src={imageUrl} alt="Upload" className="hidden" onLoad={redrawCanvas}/>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startInteraction}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseLeave={() => {
                            setMousePos(null);
                            setHoveredHandle(null);
                        }}
                        className={`${getCursorClass()} ${fullscreen ? '' : 'object-contain max-w-full max-h-full'}`}
                    />
                </>
            ) : (
                <div 
                    className="text-center p-4 w-full h-full flex items-center justify-center cursor-pointer"
                    onClick={handlePlaceholderClick}
                >
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                    <div className="border-2 border-dashed border-slate-600 rounded-xl w-full h-full flex flex-col justify-center items-center p-4 hover:bg-slate-800/50 hover:border-cyan-500 transition-colors">
                        <div className="flex items-center gap-4 text-slate-500 mb-4">
                            <UploadIcon className="w-10 h-10" />
                            <ClipboardIcon className="w-10 h-10" />
                        </div>
                        <p className="text-slate-400">Click, paste, or drag &amp; drop an image</p>
                    </div>
                </div>
            )}
        </div>
    );
};
