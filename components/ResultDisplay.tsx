import React from 'react';

interface ResultDisplayProps {
    inpaintedImage: string | null;
    placeholder?: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ inpaintedImage, placeholder }) => {
    return (
        <div className="relative w-full aspect-video flex justify-center items-center bg-slate-900/50 rounded-lg overflow-hidden min-h-[300px]">
            {inpaintedImage ? (
                <img src={inpaintedImage} alt="Inpainted Result" className="max-w-full max-h-full object-contain" />
            ) : (
                <div className="text-center p-8">
                    <p className="text-slate-400">{placeholder || 'Your generated image will appear here'}</p>
                </div>
            )}
        </div>
    );
};