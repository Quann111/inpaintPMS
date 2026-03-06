import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ImageEditor } from './ImageEditor';
import { EditingTools } from './EditingTools';
import { CheckIcon, FitToScreenIcon, XMarkIcon } from './icons';
import type { MaskData, BoundingBox, BrushMode } from '../types';

interface FullScreenEditorProps {
    onApply: () => void;
    onCancel: () => void;
    // ImageEditor props
    image: File | null;
    onImageUpload: (file: File) => void;
    onDrawEnd: (canvas: HTMLCanvasElement) => void;
    maskData: MaskData | null;
    userDefinedBox: BoundingBox | null;
    onBoxChange: (box: BoundingBox, isFinal?: boolean) => void;
    onDrawingBoxChange: (box: BoundingBox | null) => void;
    // EditingTools props
    isBusy: boolean;
    isDrawingBoxMode: boolean;
    onToggleBoxDrawing: () => void;
    onCancelBox: () => void;
    onClearMask: () => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    maskOpacity: number;
    onMaskOpacityChange: (opacity: number) => void;
    brushMode: BrushMode;
    onBrushModeChange: (mode: BrushMode) => void;
    brushColor: string;
    onBrushColorChange: (color: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    showMaskOverlay: boolean;
    onShowMaskOverlayChange: (value: boolean) => void;
    isBrushModeActive: boolean;
    onToggleBrushActive: () => void;
}


export const FullScreenEditor: React.FC<FullScreenEditorProps> = (props) => {
    const [transform, setTransform] = useState({ scale: 1, offset: { x: 0, y: 0 } });
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });

    const calculateFitTransform = useCallback(async () => {
        if (!props.image || !editorContainerRef.current) {
            return { scale: 1, offset: { x: 0, y: 0 } };
        }

        const container = editorContainerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        return new Promise<{scale: number, offset: {x: number, y: number}}>((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(props.image as File);
            
            img.onload = () => {
                const imgWidth = img.width;
                const imgHeight = img.height;
                URL.revokeObjectURL(objectUrl);

                if (imgWidth === 0 || imgHeight === 0 || containerWidth === 0 || containerHeight === 0) {
                     resolve({ scale: 1, offset: { x: 0, y: 0 } });
                     return;
                }

                const paddedContainerWidth = containerWidth * 0.95;
                const paddedContainerHeight = containerHeight * 0.95;

                const scaleX = paddedContainerWidth / imgWidth;
                const scaleY = paddedContainerHeight / imgHeight;
                const initialScale = Math.min(scaleX, scaleY);

                const scaledImgWidth = imgWidth * initialScale;
                const scaledImgHeight = imgHeight * initialScale;

                const offsetX = (containerWidth - scaledImgWidth) / 2;
                const offsetY = (containerHeight - scaledImgHeight) / 2;

                resolve({ scale: initialScale, offset: { x: offsetX, y: offsetY } });
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve({ scale: 1, offset: { x: 0, y: 0 } });
            };
            
            img.src = objectUrl;
        });
    }, [props.image]);

    useEffect(() => {
        const container = editorContainerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setEditorSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        resizeObserver.observe(container);
        
        // On mount, calculate the initial "fit" transform
        const timer = setTimeout(() => {
             calculateFitTransform().then(setTransform);
        }, 50); // Delay to ensure container dimensions are ready

        return () => {
            resizeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [calculateFitTransform]);


    const resetTransform = useCallback(() => {
        calculateFitTransform().then(setTransform);
    }, [calculateFitTransform]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.005;

        setTransform(prev => {
            const newScale = Math.max(0.2, Math.min(prev.scale + scaleAmount, 5));
            const container = editorContainerRef.current;
            if (!container) return prev;

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Adjust offset to zoom towards the mouse pointer
            const newOffsetX = mouseX - (mouseX - prev.offset.x) * (newScale / prev.scale);
            const newOffsetY = mouseY - (mouseY - prev.offset.y) * (newScale / prev.scale);
            
            return { scale: newScale, offset: { x: newOffsetX, y: newOffsetY } };
        });
    }, []);

    const stopPanning = useCallback(() => {
        if (isPanning.current) {
            isPanning.current = false;
            if (editorContainerRef.current) {
                editorContainerRef.current.style.cursor = 'auto'; // Revert to default, allowing child cursor to take precedence
            }
        }
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Pan with middle mouse button (button code is 1)
        if (e.button !== 1) return;
        
        e.preventDefault(); // Prevent default middle-click behaviors (like autoscroll)
        isPanning.current = true;
        panStart.current = { x: e.clientX - transform.offset.x, y: e.clientY - transform.offset.y };
        if (editorContainerRef.current) {
            editorContainerRef.current.style.cursor = 'grabbing';
        }
    }, [transform.offset]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Stop panning on middle mouse button release
        if (e.button === 1) {
            stopPanning();
        }
    }, [stopPanning]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        const newOffsetX = e.clientX - panStart.current.x;
        const newOffsetY = e.clientY - panStart.current.y;
        setTransform(prev => ({ ...prev, offset: { x: newOffsetX, y: newOffsetY } }));
    }, []);

    useEffect(() => {
        const container = editorContainerRef.current;
        container?.addEventListener('wheel', handleWheel, { passive: false });
        return () => container?.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') props.onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props.onCancel]);

    return (
        <div
            className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Full screen image editor"
        >
            <button
                onClick={props.onCancel}
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-white/20 transition-colors z-[60]"
                aria-label="Cancel changes and close full screen editor"
            >
                <XMarkIcon className="w-8 h-8" />
            </button>
            
            <div 
                ref={editorContainerRef}
                className="relative flex-1 flex items-center justify-center w-full h-full overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={stopPanning}
                onMouseMove={handleMouseMove}
            >
                 <ImageEditor
                    image={props.image}
                    onImageUpload={props.onImageUpload}
                    onDrawEnd={props.onDrawEnd}
                    brushSize={props.brushSize}
                    maskData={props.maskData}
                    isDrawingBoxMode={props.isDrawingBoxMode}
                    userDefinedBox={props.userDefinedBox}
                    onBoxChange={props.onBoxChange}
                    onDrawingBoxChange={props.onDrawingBoxChange}
                    brushMode={props.brushMode}
                    brushColor={props.brushColor}
                    maskOpacity={props.maskOpacity}
                    fullscreen={true}
                    fullscreenSize={editorSize}
                    transform={transform}
                    showMaskOverlay={props.showMaskOverlay}
                    isBrushModeActive={props.isBrushModeActive}
                />
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[95vw] p-4 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-lg flex items-center gap-4 flex-wrap justify-center">
                 <button
                    onClick={props.onApply}
                    className="p-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors duration-200"
                    title="Apply Changes and Close"
                >
                    <CheckIcon className="w-5 h-5" />
                </button>
                 <button
                    onClick={resetTransform}
                    className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
                    title="Fit to Screen"
                >
                    <FitToScreenIcon className="w-5 h-5" />
                </button>
                <div>
                    <EditingTools
                        isBusy={props.isBusy}
                        hasImage={!!props.image}
                        isDrawingBoxMode={props.isDrawingBoxMode}
                        onToggleBoxDrawing={props.onToggleBoxDrawing}
                        onCancelBox={props.onCancelBox}
                        canCancelBox={!!props.userDefinedBox}
                        onClearMask={props.onClearMask}
                        canClearMask={!!props.maskData?.hasDrawing}
                        showMaskOverlay={props.showMaskOverlay}
                        onShowMaskOverlayChange={props.onShowMaskOverlayChange}
                        brushSize={props.brushSize}
                        onBrushSizeChange={props.onBrushSizeChange}
                        maskOpacity={props.maskOpacity}
                        onMaskOpacityChange={props.onMaskOpacityChange}
                        brushMode={props.brushMode}
                        onBrushModeChange={props.onBrushModeChange}
                        brushColor={props.brushColor}
                        onBrushColorChange={props.onBrushColorChange}
                        onUndo={props.onUndo}
                        onRedo={props.onRedo}
                        canUndo={props.canUndo}
                        canRedo={props.canRedo}
                        orientation="horizontal"
                        isBrushModeActive={props.isBrushModeActive}
                        onToggleBrushActive={props.onToggleBrushActive}
                    />
                </div>
            </div>
        </div>
    );
};