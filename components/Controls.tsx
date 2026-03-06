
import React from 'react';
import { SparklesIcon, StitchIcon } from './icons';
import type { StitchMethod, BrushMode, BoundingBox, MaskData } from '../types';
import { EditingTools } from './EditingTools';

interface ControlsProps {
    prompt: string;
    onPromptChange: (prompt: string) => void;
    onGenerate: () => void;
    onStitch: () => void;
    isLoading: boolean;
    isStitching: boolean;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    isReadyToGenerate: boolean;
    hasImage: boolean;
    hasMask: boolean;
    hasGeneratedFocus: boolean;
    stitchMethod: StitchMethod;
    onStitchMethodChange: (method: StitchMethod) => void;
    stitchExpansion: number;
    onStitchExpansionChange: (value: number) => void;
    stitchBlur: number;
    onStitchBlurChange: (value: number) => void;
    brushMode: BrushMode;
    onBrushModeChange: (mode: BrushMode) => void;
    brushColor: string;
    onBrushColorChange: (color: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    maskOpacity: number;
    onMaskOpacityChange: (opacity: number) => void;
    onEnhancePrompt: () => void;
    isEnhancingPrompt: boolean;
    canEnhancePrompt: boolean;
    isDrawingBoxMode: boolean;
    onToggleBoxDrawing: () => void;
    onCancelBox: () => void;
    userDefinedBox: BoundingBox | null;
    onClearMask: () => void;
    maskData: MaskData | null;
    showMaskOverlay: boolean;
    onShowMaskOverlayChange: (value: boolean) => void;
    isBrushModeActive: boolean;
    onToggleBrushActive: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
    prompt, onPromptChange, onGenerate, onStitch,
    isLoading, isStitching, brushSize, onBrushSizeChange,
    isReadyToGenerate,
    hasImage, hasMask, hasGeneratedFocus,
    stitchMethod, onStitchMethodChange, stitchExpansion, onStitchExpansionChange, stitchBlur, onStitchBlurChange,
    brushMode, onBrushModeChange, brushColor, onBrushColorChange, onUndo, onRedo, canUndo, canRedo,
    maskOpacity, onMaskOpacityChange,
    onEnhancePrompt, isEnhancingPrompt, canEnhancePrompt,
    isDrawingBoxMode, onToggleBoxDrawing, onCancelBox, userDefinedBox, onClearMask, maskData,
    showMaskOverlay, onShowMaskOverlayChange, isBrushModeActive, onToggleBrushActive,
}) => {
    const isBusy = isLoading || isStitching;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
                <button onClick={onGenerate} disabled={isBusy || isEnhancingPrompt || !isReadyToGenerate} className="flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98]">
                    <SparklesIcon className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="text-sm uppercase tracking-wider">Generate</span>
                </button>
                <button onClick={onStitch} disabled={isBusy || isEnhancingPrompt || !hasGeneratedFocus} className="flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98]">
                    <StitchIcon className={`w-5 h-5 mr-2 ${isStitching ? 'animate-spin' : ''}`} />
                    <span className="text-sm uppercase tracking-wider">Stitch</span>
                </button>
            </div>

            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Prompt</label>
                    <button onClick={onEnhancePrompt} disabled={isBusy || isEnhancingPrompt || !canEnhancePrompt} className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 text-cyan-400 text-xs rounded-full transition disabled:opacity-50" title="Enhance prompt with AI">
                        <SparklesIcon className={`w-3 h-3 ${isEnhancingPrompt ? 'animate-pulse' : ''}`} />
                        <span>Enhance</span>
                    </button>
                </div>
                <textarea value={prompt} onChange={(e) => onPromptChange(e.target.value)} placeholder="Describe what you want to generate in the selected area..." rows={3} disabled={isBusy || isEnhancingPrompt || !hasImage} className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all placeholder:text-slate-600 resize-none"/>
            </div>
            
            <div className="space-y-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/50">
                <EditingTools
                    isBusy={isBusy} hasImage={hasImage} isDrawingBoxMode={isDrawingBoxMode} onToggleBoxDrawing={onToggleBoxDrawing} onCancelBox={onCancelBox} canCancelBox={!!userDefinedBox} onClearMask={onClearMask} canClearMask={!!maskData?.hasDrawing} showMaskOverlay={showMaskOverlay} onShowMaskOverlayChange={onShowMaskOverlayChange} brushSize={brushSize} onBrushSizeChange={onBrushSizeChange} maskOpacity={maskOpacity} onMaskOpacityChange={onMaskOpacityChange} brushMode={brushMode} onBrushModeChange={onBrushModeChange} brushColor={brushColor} onBrushColorChange={onBrushColorChange} onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} orientation="vertical" isBrushModeActive={isBrushModeActive} onToggleBrushActive={onToggleBrushActive}
                />
            </div>
            
            {hasImage && (
                <div className="space-y-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stitching Options</h3>
                    <div>
                        <div className={`p-1 rounded-lg flex bg-slate-800 border border-slate-700/50 ${!hasMask ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <button onClick={() => onStitchMethodChange('boundingBox')} disabled={!hasMask} className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${stitchMethod === 'boundingBox' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>Full Box</button>
                            <button onClick={() => onStitchMethodChange('mask')} disabled={!hasMask} className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${stitchMethod === 'mask' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>Mask Only</button>
                        </div>
                    </div>
                    <div>
                        <label className="flex justify-between mb-1 text-xs font-medium text-slate-400">
                            <span>Expansion</span>
                            <span>{stitchExpansion}%</span>
                        </label>
                        <input type="range" min="-25" max="50" value={stitchExpansion} onChange={(e) => onStitchExpansionChange(parseInt(e.target.value))} disabled={isBusy} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"/>
                    </div>
                    <div>
                        <label className="flex justify-between mb-1 text-xs font-medium text-slate-400">
                            <span>Edge Blend</span>
                            <span>{stitchBlur}px</span>
                        </label>
                        <input type="range" min="0" max="50" value={stitchBlur} onChange={(e) => onStitchBlurChange(parseInt(e.target.value))} disabled={isBusy} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"/>
                    </div>
                </div>
            )}
        </div>
    );
};
