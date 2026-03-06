
import React from 'react';
import { KeyIcon, FacebookIcon, LinkedInIcon, EnvelopeIcon, GlobeIcon, ZaloIcon } from './icons';
import type { ModelType, ImageSize } from '../types';

interface HeaderProps {
    model: ModelType;
    onModelChange: (model: ModelType) => void;
    imageSize: ImageSize;
    onImageSizeChange: (size: ImageSize) => void;
    isBusy: boolean;
    onSelectApiKey: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    model, 
    onModelChange, 
    imageSize, 
    onImageSizeChange, 
    isBusy,
    onSelectApiKey
}) => {
    return (
        <header className="w-full bg-slate-800 border-b border-slate-700 p-3 shadow-md flex justify-between items-center sticky top-0 z-40">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                 </div>
                 <h1 className="text-xl font-bold text-slate-100 tracking-tight hidden lg:block">
                    Gemini <span className="text-cyan-400">Inpainter</span>
                 </h1>
            </div>

            {/* Credit Section - Aligned Right */}
            <div className="hidden xl:flex items-center gap-3 text-xs text-swiss-text-muted ml-auto mr-6">
                <span>Phát triển bởi <a href="https://baoanh-nguyen.id.vn" target="_blank" rel="noopener noreferrer" className="text-swiss-text-muted hover:text-cyan-400 transition-colors" title="Website">Bảo Anh Nguyễn</a></span>
                <div className="flex items-center gap-2 border-l border-swiss-border pl-3">
                    <span className="text-swiss-text-muted text-xs">Liên hệ:</span>
                    <a href="https://baoanh-nguyen.id.vn" target="_blank" rel="noopener noreferrer" className="text-swiss-text-muted hover:text-cyan-400 transition-colors" title="Website">
                        <GlobeIcon className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/baoanhnguyenarc/" target="_blank" rel="noopener noreferrer" className="text-swiss-text-muted hover:text-cyan-400 transition-colors" title="LinkedIn">
                        <LinkedInIcon className="w-4 h-4" />
                    </a>
                    <a href="https://www.facebook.com/banhbanh.nguyen" target="_blank" rel="noopener noreferrer" className="text-swiss-text-muted hover:text-cyan-400 transition-colors" title="Facebook">
                        <FacebookIcon className="w-4 h-4" />
                    </a>
                    <a href="mailto:baoanhnguyen.kts@gmail.com" className="text-swiss-text-muted hover:text-cyan-400 transition-colors" title="Email">
                        <EnvelopeIcon className="w-4 h-4" />
                    </a>
                    <button className="text-swiss-text-muted hover:text-cyan-400 transition-colors" title="Zalo">
                        <ZaloIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Resolution Config (Pro Only) */}
                {model === 'gemini-3-pro-image-preview' && (
                    <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-slate-600 mr-2">
                        {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                            <button 
                                key={size} 
                                onClick={() => onImageSizeChange(size)} 
                                disabled={isBusy} 
                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${imageSize === size ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                )}

                {/* Model Toggle */}
                <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-slate-600">
                    <button 
                        onClick={() => onModelChange('gemini-2.5-flash-image')} 
                        disabled={isBusy} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${model === 'gemini-2.5-flash-image' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Flash
                    </button>
                    <button 
                        onClick={() => onModelChange('gemini-3-pro-image-preview')} 
                        disabled={isBusy} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${model === 'gemini-3-pro-image-preview' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Pro
                    </button>
                </div>

                {/* API Key Button (Only for Pro) */}
                {model === 'gemini-3-pro-image-preview' && (
                    <button
                        onClick={onSelectApiKey}
                        disabled={isBusy}
                        title="Configure Paid API Key"
                        className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors"
                    >
                        <KeyIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </header>
    );
};
