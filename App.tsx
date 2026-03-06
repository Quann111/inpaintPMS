
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageEditor } from './components/ImageEditor';
import { Controls } from './components/Controls';
import { ResultDisplay } from './components/ResultDisplay';
import { generateInpaintedImage, enhancePrompt } from './services/geminiService';
import { prepareImageForGemini, stitchImage } from './utils/imageUtils';
import type { MaskData, FocusData, BoundingBox, StitchMethod, BrushMode, ModelType, ImageSize, AspectRatio } from './types';
import { Header } from './components/Header';
import { PaintBrushIcon, RefreshIcon, XMarkIcon, BoxIcon, ExpandIcon, EraserIcon, DownloadIcon, CompareIcon } from './components/icons';
import { CompareSlider } from './components/CompareSlider';
import { FullScreenCompare } from './components/FullScreenCompare';
import { FullScreenEditor } from './components/FullScreenEditor';
import { ReferenceImages } from './components/ReferenceImages';

interface ReferenceImage {
  file: File;
  url: string;
}

const App: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [maskData, setMaskData] = useState<MaskData | null>(null);
    const [prompt, setPrompt] = useState<string>('enhance the detail');
    const [preparedImage, setPreparedImage] = useState<string | null>(null);
    const [generatedFocusImage, setGeneratedFocusImage] = useState<string | null>(null);
    const [inpaintedImageFile, setInpaintedImageFile] = useState<File | null>(null);
    const [inpaintedImageUrl, setInpaintedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStitching, setIsStitching] = useState<boolean>(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState<number>(40);
    const [focusData, setFocusData] = useState<FocusData | null>(null);
    const [userDefinedBox, setUserDefinedBox] = useState<BoundingBox | null>(null);
    const [drawingBox, setDrawingBox] = useState<BoundingBox | null>(null);
    const [isDrawingBoxMode, setIsDrawingBoxMode] = useState<boolean>(true);
    const [showCompareSlider, setShowCompareSlider] = useState<boolean>(false);
    const [isFullScreenCompare, setIsFullScreenCompare] = useState<boolean>(false);
    const [isFullScreenEditor, setIsFullScreenEditor] = useState<boolean>(false);
    
    const [stitchMethod, setStitchMethod] = useState<StitchMethod>('boundingBox');
    const [stitchExpansion, setStitchExpansion] = useState<number>(15);
    const [stitchBlur, setStitchBlur] = useState<number>(16);

    const [brushMode, setBrushMode] = useState<BrushMode>('draw');
    const [brushColor, setBrushColor] = useState<string>('#FF0000');
    const [maskOpacity, setMaskOpacity] = useState<number>(0.5);
    
    // History for original mask
    const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
    const [maskHistoryIndex, setMaskHistoryIndex] = useState<number>(-1);

    // New: Focus Mask state and history
    const [focusMaskData, setFocusMaskData] = useState<MaskData | null>(null);
    const [focusMaskHistory, setFocusMaskHistory] = useState<ImageData[]>([]);
    const [focusMaskHistoryIndex, setFocusMaskHistoryIndex] = useState<number>(-1);
    const [isFocusBrushActive, setIsFocusBrushActive] = useState<boolean>(false);

    const [showMaskOverlay, setShowMaskOverlay] = useState<boolean>(true);
    const [isBrushModeActive, setIsBrushModeActive] = useState<boolean>(false);

    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
    const [isRefImagesCollapsed, setIsRefImagesCollapsed] = useState<boolean>(true);

    const [model, setModel] = useState<ModelType>('gemini-2.5-flash-image');
    const [imageSize, setImageSize] = useState<ImageSize>('1K');
    const [apiKey, setApiKey] = useState<string>(() => {
        const storedKey = localStorage.getItem('GEMINI_API_KEY');
        return storedKey || '';
    });

    useEffect(() => {
        if (apiKey) localStorage.setItem('GEMINI_API_KEY', apiKey);
    }, [apiKey]);

    const [preFullscreenState, setPreFullscreenState] = useState<{
        maskData: MaskData | null;
        userDefinedBox: BoundingBox | null;
        maskHistory: ImageData[];
        maskHistoryIndex: number;
    } | null>(null);

    const toggleBrushActive = () => {
        const nextState = !isBrushModeActive;
        setIsBrushModeActive(nextState);
        if (nextState) {
            setIsDrawingBoxMode(false);
            setIsFocusBrushActive(false);
            setBrushMode('draw');
        }
    };

    const handleFocusBrushToggle = (mode: BrushMode) => {
        if (isFocusBrushActive && brushMode === mode) {
            setIsFocusBrushActive(false);
        } else {
            setIsFocusBrushActive(true);
            setBrushMode(mode);
            setIsBrushModeActive(false);
            setIsDrawingBoxMode(false);
        }
    };

    const toggleBoxDrawing = () => {
        const nextState = !isDrawingBoxMode;
        setIsDrawingBoxMode(nextState);
        if (nextState) {
            setIsBrushModeActive(false);
            setIsFocusBrushActive(false);
        }
    };

    useEffect(() => {
        setPreparedImage(null);
        setFocusData(null);
        setGeneratedFocusImage(null);
        setFocusMaskData(null);
        setFocusMaskHistory([]);
        setFocusMaskHistoryIndex(-1);
        setShowCompareSlider(false);
    }, [maskData, userDefinedBox]);

    useEffect(() => {
        return () => {
            if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
            if (inpaintedImageUrl) URL.revokeObjectURL(inpaintedImageUrl);
        };
    }, [originalImageUrl, inpaintedImageUrl]);
    
    const resetStateForNewImage = () => {
        setInpaintedImageFile(null);
        if (inpaintedImageUrl) URL.revokeObjectURL(inpaintedImageUrl);
        setInpaintedImageUrl(null);
        setMaskData(null);
        setUserDefinedBox(null);
        setDrawingBox(null);
        setIsDrawingBoxMode(true);
        setIsBrushModeActive(false);
        setIsFocusBrushActive(false);
        setError(null);
        setFocusData(null);
        setPreparedImage(null);
        setGeneratedFocusImage(null);
        setFocusMaskData(null);
        setFocusMaskHistory([]);
        setFocusMaskHistoryIndex(-1);
        setShowCompareSlider(false);
        setMaskHistory([]);
        setMaskHistoryIndex(-1);
        setReferenceImages(current => {
            current.forEach(img => URL.revokeObjectURL(img.url));
            return [];
        });
        setIsRefImagesCollapsed(true);
    };

    const handleImageUpload = (file: File) => {
        if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
        setOriginalImage(file);
        setOriginalImageUrl(URL.createObjectURL(file));
        resetStateForNewImage();
    };

    const handleRemoveImage = () => {
        if (isBusy) return;
        if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
        setOriginalImage(null);
        setOriginalImageUrl(null);
        resetStateForNewImage();
    };
    
    const updateMaskFromHistory = (index: number, isFocus: boolean = false) => {
        const history = isFocus ? focusMaskHistory : maskHistory;
        const imageData = history[index];
        const newCanvas = document.createElement('canvas');
        newCanvas.width = imageData.width;
        newCanvas.height = imageData.height;
        const ctx = newCanvas.getContext('2d');
        if (ctx) {
            ctx.putImageData(imageData, 0, 0);
            const buffer = new Uint32Array(imageData.data.buffer);
            const hasDrawing = buffer.some(color => color !== 0);
            if (isFocus) {
                setFocusMaskData({ maskCanvas: newCanvas, hasDrawing });
            } else {
                setMaskData({ maskCanvas: newCanvas, hasDrawing });
            }
        }
    };

    const handleUndo = () => {
        const targetIsFocus = isFocusBrushActive;
        const index = targetIsFocus ? focusMaskHistoryIndex : maskHistoryIndex;
        
        if (index > 0) {
            const newIndex = index - 1;
            if (targetIsFocus) setFocusMaskHistoryIndex(newIndex); else setMaskHistoryIndex(newIndex);
            updateMaskFromHistory(newIndex, targetIsFocus);
        } else if (index === 0) {
            if (targetIsFocus) {
                setFocusMaskHistoryIndex(-1);
                setFocusMaskData(null);
            } else {
                setMaskHistoryIndex(-1);
                setMaskData(null);
            }
        }
    };

    const handleRedo = () => {
        const targetIsFocus = isFocusBrushActive;
        const index = targetIsFocus ? focusMaskHistoryIndex : maskHistoryIndex;
        const history = targetIsFocus ? focusMaskHistory : maskHistory;

        if (index < history.length - 1) {
            const newIndex = index + 1;
            if (targetIsFocus) setFocusMaskHistoryIndex(newIndex); else setMaskHistoryIndex(newIndex);
            updateMaskFromHistory(newIndex, targetIsFocus);
        }
    };

    const handleDrawEnd = (newMaskCanvas: HTMLCanvasElement, isFocus: boolean = false) => {
        const history = isFocus ? focusMaskHistory : maskHistory;
        const index = isFocus ? focusMaskHistoryIndex : maskHistoryIndex;
        
        const newHistory = history.slice(0, index + 1);
        const ctx = newMaskCanvas.getContext('2d');
        if (ctx) {
            const newImageData = ctx.getImageData(0, 0, newMaskCanvas.width, newMaskCanvas.height);
            const buffer = new Uint32Array(newImageData.data.buffer);
            const hasDrawing = buffer.some(color => color !== 0);
            
            if (isFocus) {
                setFocusMaskHistory([...newHistory, newImageData]);
                setFocusMaskHistoryIndex(newHistory.length);
                setFocusMaskData({ maskCanvas: newMaskCanvas, hasDrawing });
            } else {
                setMaskHistory([...newHistory, newImageData]);
                setMaskHistoryIndex(newHistory.length);
                setMaskData({ maskCanvas: newMaskCanvas, hasDrawing });
            }
        }
    };

    const handleCancelBox = () => {
        setUserDefinedBox(null);
        setDrawingBox(null);
    };

    const handleClearMask = () => {
        if (isFocusBrushActive) {
            setFocusMaskData(null);
            setFocusMaskHistory([]);
            setFocusMaskHistoryIndex(-1);
        } else {
            setMaskData(null);
            setMaskHistory([]);
            setMaskHistoryIndex(-1);
        }
    };

    const handleOpenFullScreenEditor = () => {
        setPreFullscreenState({
            maskData,
            userDefinedBox,
            maskHistory: [...maskHistory],
            maskHistoryIndex
        });
        setIsFullScreenEditor(true);
    };

    const handleApplyFullscreen = () => {
        setIsFullScreenEditor(false);
        setPreFullscreenState(null);
    };

    const handleCancelFullscreen = () => {
        if (preFullscreenState) {
            setMaskData(preFullscreenState.maskData);
            setUserDefinedBox(preFullscreenState.userDefinedBox);
            setMaskHistory(preFullscreenState.maskHistory);
            setMaskHistoryIndex(preFullscreenState.maskHistoryIndex);
        }
        setIsFullScreenEditor(false);
        setPreFullscreenState(null);
    };

    const handleUseAsInput = () => {
        if (inpaintedImageFile) {
            handleImageUpload(inpaintedImageFile);
        }
    };

    const handleOpenApiKeyDialog = async () => {
        if (window.aistudio) await window.aistudio.openSelectKey();
    };

    const handleGenerate = useCallback(async () => {
        if (!originalImage || !prompt) {
            setError('Please upload an image and enter a prompt.');
            return;
        }

        if (model === 'gemini-3-pro-image-preview' && window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) await handleOpenApiKeyDialog();
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const { preparedImageBase64, mimeType, focusData: newFocusData, aspectRatio } = await prepareImageForGemini(originalImage, maskData, userDefinedBox, maskOpacity);
            setFocusData(newFocusData);
            setPreparedImage(`data:${mimeType};base64,${preparedImageBase64}`);
            
            const processedRefImages = await Promise.all(referenceImages.map(async (ref) => {
                return new Promise<{ base64: string; mimeType: string }>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const [header, base64] = (reader.result as string).split(',');
                        resolve({ base64, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' });
                    };
                    reader.readAsDataURL(ref.file);
                });
            }));

            if (!apiKey && model !== 'gemini-3-pro-image-preview') {
                setError('Please enter your Gemini API Key first.');
                setIsLoading(false);
                return;
            }

            const result = await generateInpaintedImage(
                apiKey,
                preparedImageBase64, 
                mimeType, 
                prompt, 
                !!maskData?.hasDrawing, 
                processedRefImages, 
                model,
                aspectRatio,
                imageSize
            );
            
            setGeneratedFocusImage(`data:image/png;base64,${result}`);
            // Reset focus mask when new content generated
            setFocusMaskData(null);
            setFocusMaskHistory([]);
            setFocusMaskHistoryIndex(-1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed.');
        } finally {
            setIsLoading(false);
        }
    }, [originalImage, maskData, prompt, userDefinedBox, maskOpacity, referenceImages, model, imageSize, apiKey]);

    const handleStitch = useCallback(async () => {
        if (!originalImage || !generatedFocusImage || !focusData) return;
        setIsStitching(true);
        try {
            const result = await stitchImage(
                originalImage, 
                generatedFocusImage.split(',')[1], 
                focusData, 
                maskData,
                stitchMethod,
                stitchExpansion,
                stitchBlur,
                focusMaskData // Added focus specific mask
            );
            setInpaintedImageFile(result);
            if (inpaintedImageUrl) URL.revokeObjectURL(inpaintedImageUrl);
            setInpaintedImageUrl(URL.createObjectURL(result));
        } finally {
            setIsStitching(false);
        }
    }, [originalImage, generatedFocusImage, focusData, maskData, stitchMethod, stitchExpansion, stitchBlur, inpaintedImageUrl, focusMaskData]);

    const handleEnhancePrompt = useCallback(async () => {
        if (!originalImage) return;
        setIsEnhancingPrompt(true);
        try {
            const { preparedImageBase64, mimeType } = await prepareImageForGemini(originalImage, maskData, userDefinedBox, maskOpacity);
            if (!apiKey && model !== 'gemini-3-pro-image-preview') {
                setError('Please enter your Gemini API Key first.');
                setIsEnhancingPrompt(false);
                return;
            }
            const enhanced = await enhancePrompt(apiKey, preparedImageBase64, mimeType, prompt);
            setPrompt(enhanced);
        } finally {
            setIsEnhancingPrompt(false);
        }
    }, [originalImage, maskData, userDefinedBox, prompt, maskOpacity, apiKey]);

    const isBusy = isLoading || isStitching || isEnhancingPrompt;
    const canCompare = !!preparedImage && !!generatedFocusImage;
    const displayedBox = drawingBox || userDefinedBox;

    const currentCanUndo = isFocusBrushActive ? focusMaskHistoryIndex >= 0 : maskHistoryIndex >= 0;
    const currentCanRedo = isFocusBrushActive ? focusMaskHistoryIndex < focusMaskHistory.length - 1 : maskHistoryIndex < maskHistory.length - 1;

    return (
        <div className="min-h-screen text-slate-200 font-sans">
            <Header 
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                model={model} 
                onModelChange={setModel} 
                imageSize={imageSize} 
                onImageSizeChange={setImageSize} 
                isBusy={isBusy}
            />
            <main className="p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6 p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-lg">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                             <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-cyan-400">Editor</h2>
                                {displayedBox && <span className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded-md">{Math.round(displayedBox.width)}x{Math.round(displayedBox.height)}</span>}
                             </div>
                             <div className="flex items-center gap-2">
                                <button onClick={toggleBrushActive} disabled={isBusy || !originalImage} className={`p-2 rounded-lg transition ${isBrushModeActive ? 'bg-cyan-500' : 'bg-slate-700'}`} title="Brush (Draw on Original)"><PaintBrushIcon className="w-5 h-5"/></button>
                                <button onClick={toggleBoxDrawing} disabled={isBusy || !originalImage} className={`p-2 rounded-lg transition ${isDrawingBoxMode ? 'bg-yellow-500' : 'bg-slate-700'}`} title="Define Focus Area"><BoxIcon className="w-5 h-5"/></button>
                                <button onClick={handleCancelBox} disabled={isBusy || !userDefinedBox} className="p-2 bg-slate-700 rounded-lg" title="Remove Focus Box"><XMarkIcon className="w-5 h-5"/></button>
                                <button onClick={() => { setIsFocusBrushActive(false); handleClearMask(); }} disabled={isBusy || !maskData?.hasDrawing} className="p-2 bg-slate-700 rounded-lg" title="Clear Mask"><EraserIcon className="w-5 h-5"/></button>
                                <button onClick={handleOpenFullScreenEditor} disabled={isBusy || !originalImage} className="p-2 bg-slate-700 rounded-lg" title="Full Screen"><ExpandIcon className="w-5 h-5"/></button>
                                <button onClick={handleRemoveImage} disabled={!originalImage} className="p-2 bg-slate-700 text-red-400 rounded-lg"><XMarkIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <ImageEditor
                            image={originalImage}
                            onImageUpload={handleImageUpload}
                            onDrawEnd={(c) => handleDrawEnd(c, false)}
                            brushSize={brushSize}
                            maskData={maskData}
                            isDrawingBoxMode={isDrawingBoxMode}
                            userDefinedBox={userDefinedBox}
                            onBoxChange={(box, isFinal) => { setUserDefinedBox(box); if (isFinal) setIsDrawingBoxMode(false); }}
                            onDrawingBoxChange={setDrawingBox}
                            brushMode={brushMode}
                            brushColor={brushColor}
                            maskOpacity={maskOpacity}
                            showMaskOverlay={showMaskOverlay}
                            isBrushModeActive={isBrushModeActive}
                        />
                    </div>

                    <div className="flex flex-col gap-6 p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-lg">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-cyan-400">Result</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsFullScreenCompare(true)} disabled={!inpaintedImageUrl || !originalImageUrl} className="p-2 bg-slate-600 rounded-lg"><ExpandIcon className="w-5 h-5"/></button>
                                <button onClick={() => { if (inpaintedImageUrl) { const l = document.createElement('a'); l.href = inpaintedImageUrl; l.download = 'result.jpg'; l.click(); }}} disabled={!inpaintedImageUrl} className="p-2 bg-slate-600 rounded-lg"><DownloadIcon className="w-5 h-5"/></button>
                                <button onClick={handleUseAsInput} disabled={!inpaintedImageFile} className="p-2 bg-slate-600 rounded-lg"><RefreshIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
                        <ResultDisplay inpaintedImage={inpaintedImageUrl} placeholder="Final image will appear here"/>
                    </div>

                    <div className="flex flex-col gap-6 p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-lg">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h2 className="text-2xl font-bold text-cyan-400">Focus</h2>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleFocusBrushToggle('draw')} 
                                    disabled={isBusy || !generatedFocusImage} 
                                    className={`p-2 rounded-lg transition ${isFocusBrushActive && brushMode === 'draw' ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                    title="Brush (Draw on Focus)"
                                >
                                    <PaintBrushIcon className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => handleFocusBrushToggle('erase')} 
                                    disabled={isBusy || !generatedFocusImage} 
                                    className={`p-2 rounded-lg transition ${isFocusBrushActive && brushMode === 'erase' ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                    title="Eraser (Erase on Focus)"
                                >
                                    <EraserIcon className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => { setIsFocusBrushActive(true); handleClearMask(); }} 
                                    disabled={isBusy || !focusMaskData?.hasDrawing} 
                                    className="p-2 bg-slate-700 rounded-lg"
                                    title="Clear Focus Mask"
                                >
                                    <EraserIcon className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => setShowCompareSlider(!showCompareSlider)} 
                                    disabled={!canCompare} 
                                    className={`p-2 rounded-lg ${showCompareSlider ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                    title="Compare with Crop"
                                >
                                    <CompareIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[300px]">
                                <RefreshIcon className="w-12 h-12 animate-spin text-cyan-500"/>
                            </div>
                        ) : showCompareSlider && canCompare ? (
                            <CompareSlider image1={preparedImage!} image2={generatedFocusImage!} />
                        ) : generatedFocusImage ? (
                            <ImageEditor
                                image={null}
                                imageUrl={generatedFocusImage}
                                onImageUpload={() => {}}
                                onDrawEnd={(c) => handleDrawEnd(c, true)}
                                brushSize={brushSize}
                                maskData={focusMaskData}
                                isDrawingBoxMode={false}
                                userDefinedBox={null}
                                onBoxChange={() => {}}
                                onDrawingBoxChange={() => {}}
                                brushMode={brushMode}
                                brushColor={brushColor}
                                maskOpacity={maskOpacity}
                                showMaskOverlay={showMaskOverlay}
                                isBrushModeActive={isFocusBrushActive}
                            />
                        ) : (
                            <ResultDisplay inpaintedImage={null} placeholder="Generated area will appear here"/>
                        )}
                    </div>
                    
                    <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-lg flex flex-col gap-6">
                        {originalImage && <ReferenceImages images={referenceImages} onAddImage={(f) => setReferenceImages([...referenceImages, { file: f, url: URL.createObjectURL(f) }])} onRemoveImage={(i) => setReferenceImages(referenceImages.filter((_, idx) => idx !== i))} isCollapsed={isRefImagesCollapsed} onToggleCollapse={() => setIsRefImagesCollapsed(!isRefImagesCollapsed)} isBusy={isBusy} />}
                        <Controls
                            prompt={prompt}
                            onPromptChange={setPrompt}
                            onGenerate={handleGenerate}
                            onStitch={handleStitch}
                            isLoading={isLoading}
                            isStitching={isStitching}
                            brushSize={brushSize}
                            onBrushSizeChange={setBrushSize}
                            isReadyToGenerate={!!originalImage && prompt.length > 0}
                            hasImage={!!originalImage}
                            hasMask={!!maskData?.hasDrawing || !!focusMaskData?.hasDrawing}
                            hasGeneratedFocus={!!generatedFocusImage}
                            stitchMethod={stitchMethod}
                            onStitchMethodChange={setStitchMethod}
                            stitchExpansion={stitchExpansion}
                            onStitchExpansionChange={setStitchExpansion}
                            stitchBlur={stitchBlur}
                            onStitchBlurChange={setStitchBlur}
                            brushMode={brushMode}
                            onBrushModeChange={setBrushMode}
                            brushColor={brushColor}
                            onBrushColorChange={setBrushColor}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={currentCanUndo}
                            canRedo={currentCanRedo}
                            maskOpacity={maskOpacity}
                            onMaskOpacityChange={setMaskOpacity}
                            onEnhancePrompt={handleEnhancePrompt}
                            isEnhancingPrompt={isEnhancingPrompt}
                            canEnhancePrompt={!!originalImage}
                            isDrawingBoxMode={isDrawingBoxMode}
                            onToggleBoxDrawing={toggleBoxDrawing}
                            onCancelBox={handleCancelBox}
                            userDefinedBox={userDefinedBox}
                            onClearMask={handleClearMask}
                            maskData={maskData}
                            showMaskOverlay={showMaskOverlay}
                            onShowMaskOverlayChange={setShowMaskOverlay}
                            isBrushModeActive={isBrushModeActive || isFocusBrushActive}
                            onToggleBrushActive={toggleBrushActive}
                        />
                    </div>
                </div>
            </main>
            {isFullScreenCompare && originalImageUrl && inpaintedImageUrl && <FullScreenCompare originalImage={originalImageUrl} inpaintedImage={inpaintedImageUrl} onClose={() => setIsFullScreenCompare(false)} />}
            {isFullScreenEditor && originalImage && (
                <FullScreenEditor
                    onApply={handleApplyFullscreen}
                    onCancel={handleCancelFullscreen}
                    image={originalImage}
                    onImageUpload={handleImageUpload}
                    onDrawEnd={(c) => handleDrawEnd(c, false)}
                    maskData={maskData}
                    userDefinedBox={userDefinedBox}
                    onBoxChange={setUserDefinedBox}
                    onDrawingBoxChange={setDrawingBox}
                    isBusy={isBusy}
                    isDrawingBoxMode={isDrawingBoxMode}
                    onToggleBoxDrawing={toggleBoxDrawing}
                    onCancelBox={handleCancelBox}
                    onClearMask={handleClearMask}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    maskOpacity={maskOpacity}
                    onMaskOpacityChange={setMaskOpacity}
                    brushMode={brushMode}
                    onBrushModeChange={setBrushMode}
                    brushColor={brushColor}
                    onBrushColorChange={setBrushColor}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={maskHistoryIndex >= 0}
                    canRedo={maskHistoryIndex < maskHistory.length - 1}
                    showMaskOverlay={showMaskOverlay}
                    onShowMaskOverlayChange={setShowMaskOverlay}
                    isBrushModeActive={isBrushModeActive}
                    onToggleBrushActive={toggleBrushActive}
                />
            )}
        </div>
    );
};

export default App;
