
import React, { useState, useRef, useCallback } from 'react';

interface CompareSliderProps {
    image1: string; // Base image (left)
    image2: string; // Overlay image (right)
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ image1, image2 }) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        setSliderPosition(percent);
    }, []);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleMove(e.clientX);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    // FIX: Removed typo '_' before 'const'.
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
    }

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        handleMove(e.touches[0].clientX);
    }, [isDragging, handleMove]);


    return (
        <div 
            ref={containerRef}
            className="relative w-full aspect-video flex justify-center items-center bg-slate-900/50 rounded-lg overflow-hidden min-h-[300px] cursor-e-resize select-none touch-none"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleDragEnd}
            onTouchCancel={handleDragEnd}
            onTouchMove={handleTouchMove}
        >
            <img 
                src={image1} 
                alt="Original Focus" 
                className="absolute inset-0 max-w-full max-h-full object-contain w-full h-full pointer-events-none"
                draggable="false"
            />
            <div 
                className="absolute inset-0 w-full h-full"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                 <img 
                    src={image2} 
                    alt="Generated Focus" 
                    className="absolute inset-0 max-w-full max-h-full object-contain w-full h-full pointer-events-none"
                    draggable="false"
                />
            </div>
            <div 
                className="absolute top-0 bottom-0 w-1 bg-white/50 pointer-events-none"
                style={{ left: `${sliderPosition}%`, transform: `translateX(-50%)` }}
            >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/80 border-2 border-slate-800 flex items-center justify-center cursor-e-resize">
                    <svg className="w-6 h-6 text-slate-800 rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
