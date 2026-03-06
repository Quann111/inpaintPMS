
import React from 'react';
import { BoxIcon, EraserIcon, UndoIcon, RedoIcon, PaintBrushIcon, XMarkIcon, EyeIcon, EyeSlashIcon } from './icons';
import type { BrushMode } from '../types';

interface EditingToolsProps {
    isBusy: boolean;
    hasImage: boolean;
    // Box/Mask controls
    isDrawingBoxMode: boolean;
    onToggleBoxDrawing: () => void;
    onCancelBox: () => void;
    canCancelBox: boolean;
    onClearMask: () => void;
    canClearMask: boolean;
    showMaskOverlay: boolean;
    onShowMaskOverlayChange: (value: boolean) => void;
    // Brush
    isBrushModeActive: boolean;
    onToggleBrushActive: () => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    maskOpacity: number;
    onMaskOpacityChange: (opacity: number) => void;
    brushMode: BrushMode;
    onBrushModeChange: (mode: BrushMode) => void;
    brushColor: string;
    onBrushColorChange: (color: string) => void;
    // History
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    // Layout
    orientation?: 'vertical' | 'horizontal';
}

export const EditingTools: React.FC<EditingToolsProps> = ({
    isBusy, hasImage,
    isDrawingBoxMode, onToggleBoxDrawing,
    onCancelBox, canCancelBox,
    onClearMask, canClearMask,
    showMaskOverlay, onShowMaskOverlayChange,
    isBrushModeActive, onToggleBrushActive,
    brushSize, onBrushSizeChange,
    maskOpacity, onMaskOpacityChange,
    brushMode, onBrushModeChange,
    brushColor, onBrushColorChange,
    onUndo, onRedo, canUndo, canRedo,
    orientation = 'vertical',
}) => {
    
    const layoutClasses = {
        container: orientation === 'vertical' ? 'space-y-4' : 'flex items-center gap-4 flex-wrap justify-center',
        group: orientation === 'vertical' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-center' : 'flex items-center gap-2',
        sliderContainer: orientation === 'vertical' ? '' : 'flex-1 min-w-[150px]',
        buttonGroupContainer: orientation === 'vertical' ? 'flex items-center gap-4' : 'flex items-center gap-4',
    };

    const generalDisabled = isBusy || !hasImage;
    const brushControlsDisabled = generalDisabled || !isBrushModeActive;

    return (
        <div className={layoutClasses.container}>
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
                 <button onClick={onToggleBrushActive} className={`p-2 rounded-lg transition-colors duration-200 text-white ${isBrushModeActive ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'} disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`} disabled={generalDisabled} title={isBrushModeActive ? "Disable Brush" : "Enable Brush"}>
                    <PaintBrushIcon className="w-5 h-5" />
                </button>
                <button onClick={onToggleBoxDrawing} className={`p-2 rounded-lg transition-colors duration-200 text-white ${isDrawingBoxMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-slate-700 hover:bg-slate-600'} disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`} disabled={generalDisabled} title={!hasImage ? "Upload an image first" : (isDrawingBoxMode ? 'Cancel Drawing' : 'Define Focus Area')}>
                    <BoxIcon className="w-5 h-5" />
                </button>
                <button onClick={onCancelBox} className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200" disabled={isBusy || !canCancelBox} title="Remove defined focus area">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <button onClick={onClearMask} className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200" disabled={isBusy || !canClearMask} title="Clear the entire mask">
                    <EraserIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onShowMaskOverlayChange(!showMaskOverlay)} className={`p-2 rounded-lg transition-colors duration-200 text-white ${showMaskOverlay ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'} disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`} disabled={generalDisabled} title={showMaskOverlay ? "Hide Mask Overlay" : "Show Mask Overlay"}>
                    {showMaskOverlay ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>
            </div>

            {/* Sliders */}
            <div className={layoutClasses.group}>
                <div className={layoutClasses.sliderContainer}>
                    <label htmlFor="brushSize" className={`block mb-1 text-xs font-medium ${brushControlsDisabled ? 'text-slate-500' : 'text-slate-400'}`}>Size: {brushSize}px</label>
                    <input id="brushSize" type="range" min="5" max="100" value={brushSize} onChange={(e) => onBrushSizeChange(parseInt(e.target.value, 10))} disabled={brushControlsDisabled} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:accent-slate-600"/>
                </div>
                 <div className={layoutClasses.sliderContainer}>
                    <label htmlFor="maskOpacity" className={`block mb-1 text-xs font-medium ${brushControlsDisabled ? 'text-slate-500' : 'text-slate-400'}`}>Opacity: {Math.round(maskOpacity * 100)}%</label>
                    <input id="maskOpacity" type="range" min="0.1" max="1" step="0.05" value={maskOpacity} onChange={(e) => onMaskOpacityChange(parseFloat(e.target.value))} disabled={brushControlsDisabled} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:accent-slate-600"/>
                </div>
            </div>

            {/* Brush Mode & History */}
            <div className={layoutClasses.buttonGroupContainer}>
                <div className={`flex-grow p-1 rounded-lg flex transition-opacity ${brushControlsDisabled ? 'opacity-50 cursor-not-allowed' : 'bg-slate-700'}`}>
                     <button onClick={() => onBrushModeChange('draw')} disabled={brushControlsDisabled} title="Draw Mask" className={`flex-1 flex items-center justify-center p-2 rounded-md transition-colors duration-200 ${brushMode === 'draw' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                        <PaintBrushIcon className="w-5 h-5" />
                    </button>
                     <button onClick={() => onBrushModeChange('erase')} disabled={brushControlsDisabled} title="Erase Mask" className={`flex-1 flex items-center justify-center p-2 rounded-md transition-colors duration-200 ${brushMode === 'erase' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                        <EraserIcon className="w-5 h-5" />
                    </button>
                </div>
                 <div className="flex items-center gap-2">
                    <label htmlFor="brushColor" className="text-sm font-medium text-slate-400 sr-only">Color</label>
                    <input id="brushColor" type="color" value={brushColor} onChange={(e) => onBrushColorChange(e.target.value)} disabled={brushControlsDisabled} className="w-10 h-10 p-1 bg-slate-800 border-slate-700 rounded-lg cursor-pointer disabled:cursor-not-allowed"/>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onUndo} disabled={isBusy || !canUndo || !isBrushModeActive} title="Undo" className="p-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200">
                        <UndoIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={onRedo} disabled={isBusy || !canRedo || !isBrushModeActive} title="Redo" className="p-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200">
                        <RedoIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
