
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { XMarkIcon } from './icons';

interface FullScreenCompareProps {
    originalImage: string;
    inpaintedImage: string;
    onClose: () => void;
}

export const FullScreenCompare: React.FC<FullScreenCompareProps> = ({ originalImage, inpaintedImage, onClose }) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    
    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        setSliderPosition(percent);
    }, []);

    const handleInteractionStart = (clientX: number) => {
        setIsDragging(true);
        handleMove(clientX);
    };
    
    const handleInteractionEnd = () => {
        setIsDragging(false);
    };

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        handleMove(e.clientX);
    }, [isDragging, handleMove]);
    
    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        handleMove(e.touches[0].clientX);
    }, [isDragging, handleMove]);

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Image comparison view"
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-white/20 transition-colors z-[60]"
                aria-label="Close full screen view"
            >
                <XMarkIcon className="w-8 h-8" />
            </button>
            <div 
                ref={containerRef}
                className="relative cursor-e-resize select-none touch-none"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => handleInteractionStart(e.clientX)}
                onMouseUp={handleInteractionEnd}
                onMouseLeave={handleInteractionEnd}
                onMouseMove={handleMouseMove}
                onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX)}
                onTouchEnd={handleInteractionEnd}
                onTouchCancel={handleInteractionEnd}
                onTouchMove={handleTouchMove}
            >
                <img 
                    src={originalImage} 
                    alt="Original" 
                    className="block max-w-[95vw] max-h-[95vh] object-contain pointer-events-none"
                    draggable="false"
                />
                <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                     <img 
                        src={inpaintedImage} 
                        alt="Inpainted Result" 
                        className="block w-full h-full object-contain pointer-events-none"
                        draggable="false"
                    />
                </div>
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-white/50 pointer-events-none z-[55]"
                    style={{ left: `${sliderPosition}%`, transform: `translateX(-50%)` }}
                    aria-hidden="true"
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/80 border-2 border-slate-800 flex items-center justify-center cursor-e-resize">
                        <svg className="w-6 h-6 text-slate-800 rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
