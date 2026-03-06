
import React, { useRef, useState } from 'react';
import { ChevronDownIcon, PlusIcon, XMarkIcon } from './icons';

interface ReferenceImage {
  file: File;
  url: string;
}

interface ReferenceImagesProps {
  images: ReferenceImage[];
  onAddImage: (file: File) => void;
  onRemoveImage: (index: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isBusy: boolean;
}

export const ReferenceImages: React.FC<ReferenceImagesProps> = ({
  images,
  onAddImage,
  onRemoveImage,
  isCollapsed,
  onToggleCollapse,
  isBusy
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddImage(e.target.files[0]);
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isBusy && images.length < 3) {
          setIsDragging(true);
      }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isBusy || images.length >= 3) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
          const file = files[0];
           if (file.type.startsWith('image/')) {
              onAddImage(file);
          }
      }
  };


  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700">
      <button
        onClick={onToggleCollapse}
        className="w-full flex justify-between items-center p-3 hover:bg-slate-700/50 rounded-t-lg transition-colors"
        aria-expanded={!isCollapsed}
      >
        <h3 className="text-lg font-semibold text-slate-300">Reference Images ({images.length})</h3>
        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>
      {!isCollapsed && (
        <div 
            className={`p-4 border-t border-slate-700 transition-colors duration-200 ${isDragging ? 'bg-cyan-900/20 border-cyan-500' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={image.url}
                  alt={`Reference ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  disabled={isBusy}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="Remove image"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <button
                onClick={handleAddClick}
                disabled={isBusy}
                className="flex flex-col items-center justify-center aspect-square bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-md text-slate-500 hover:text-cyan-400 transition-colors disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:hover:border-slate-600 disabled:hover:text-slate-500"
                title="Add reference image (max 3) - or Drag & Drop here"
              >
                <PlusIcon className="w-8 h-8" />
                <span className="text-xs mt-1">Add Image</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                />
              </button>
            )}
          </div>
          {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 pointer-events-none rounded-b-lg">
                  <p className="text-cyan-400 font-bold text-lg drop-shadow-md">Drop image here</p>
              </div>
          )}
        </div>
      )}
    </div>
  );
};
