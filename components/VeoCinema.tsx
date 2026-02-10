
import React, { useState, useRef, useEffect } from 'react';
import { Film, Clapperboard, Monitor, Download, Loader2, Scissors, Sparkles, Image as ImageIcon, X, Key, Clock, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedVideo, Language } from '../types';
import { translations } from '../translations';

interface VeoCinemaProps {
  language: Language;
}

export const VeoCinema: React.FC<VeoCinemaProps> = ({ language }) => {
  const t = translations[language];
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasKey(true);
    setAuthError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = (event.target?.result as string).split(',')[1];
      setStartImage(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !startImage || isGenerating) return;

    setIsGenerating(true);
    setProgress(5);
    setAuthError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || undefined,
        image: startImage ? { imageBytes: startImage, mimeType: 'image/png' } : undefined,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: aspectRatio
        }
      });

      let pollCount = 0;
      while (!operation.done) {
        pollCount++;
        setProgress(Math.min(95, 10 + (pollCount * 5)));
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);
        
        const newVideo: GeneratedVideo = {
          id: Math.random().toString(36).substr(2, 9),
          url: videoUrl,
          prompt: prompt || "Visual Sequence",
          timestamp: Date.now(),
          rawVideoData: operation.response?.generatedVideos?.[0]?.video,
          trimStart: 0,
          trimEnd: 10 
        };
        setVideos(prev => [newVideo, ...prev]);
        setPrompt('');
        setStartImage(null);
      }
    } catch (error: any) {
      console.error('Veo synthesis failed:', error);
      const msg = error.message || "";
      if (msg.includes('401') || msg.includes('API keys are not supported') || msg.includes('Requested entity was not found')) {
        setAuthError(t.paidKeyInfo);
        setHasKey(false);
      } else {
        setAuthError(t.errorOccurred + ": " + msg);
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleExport = (video: GeneratedVideo) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `nexus-render-${video.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateTrim = (id: string, start: number, end: number) => {
    setVideos(prev => prev.map(v => 
      v.id === id ? { ...v, trimStart: start, trimEnd: end } : v
    ));
  };

  if (hasKey === false || authError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#030712] text-center space-y-10 animate-in fade-in duration-1000">
        <div className="p-10 bg-red-500/10 rounded-[56px] border border-red-500/20 shadow-2xl shadow-red-500/5 group">
          <AlertCircle className="w-20 h-20 text-red-500 group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">{t.paidKeyRequired}</h2>
          <p className="text-gray-400 font-medium leading-relaxed">
            {authError || t.paidKeyInfo}
          </p>
          <div className="pt-4">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:text-white font-black uppercase tracking-[0.3em] transition-colors"
            >
              Billing Documentation
            </a>
          </div>
        </div>
        <button 
          onClick={handleSelectKey} 
          className="px-14 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl shadow-2xl shadow-indigo-500/30 transition-all uppercase tracking-[0.2em] text-xs active:scale-95"
        >
          {t.selectKey}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#030712]">
      <div className="max-w-5xl mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800/50 pb-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-5">
               <div className="p-4 bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-500/30">
                  <Film className="w-7 h-7 text-white" />
               </div>
               <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">{t.veoCinema}</h2>
            </div>
            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[11px] italic">Powered by Veo 3.1 Neural Engine</p>
          </div>
          
          <div className="flex items-center space-x-3 bg-gray-950 p-2 rounded-2xl border border-gray-800">
            <button onClick={() => setAspectRatio('16:9')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-gray-600 hover:text-gray-200'}`}>Landscape</button>
            <button onClick={() => setAspectRatio('9:16')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-gray-600 hover:text-gray-200'}`}>Portrait</button>
          </div>
        </header>

        <section className="bg-gray-900/40 border border-gray-800 rounded-[64px] p-12 backdrop-blur-3xl shadow-2xl space-y-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-3 space-y-6">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest ml-6 italic">Director's Script</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                className="w-full bg-gray-950 border border-gray-800 rounded-[40px] p-10 text-gray-100 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all min-h-[200px] text-2xl font-medium leading-relaxed shadow-inner"
              />
            </div>
            
            <div className="space-y-6">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest ml-6 italic">{t.uploadStartFrame}</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full h-[200px] border-2 border-dashed rounded-[40px] flex flex-col items-center justify-center cursor-pointer transition-all ${startImage ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-800 hover:border-indigo-500 bg-gray-950'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                {startImage ? (
                  <>
                    <img src={`data:image/png;base64,${startImage}`} className="w-full h-full object-cover rounded-[38px]" />
                    <button onClick={(e) => { e.stopPropagation(); setStartImage(null); }} className="absolute -top-4 -right-4 p-3 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-500 transition-colors"><X className="w-5 h-5" /></button>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-gray-700 mb-3" />
                    <span className="text-[10px] font-black uppercase text-gray-600 tracking-[0.2em]">{language === 'PL' ? 'Wgraj start' : 'Upload Frame'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-gray-800/50">
            <div className="flex items-center space-x-12 text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] italic">
              <div className="flex items-center space-x-4">
                <Monitor className="w-4 h-4" />
                <span>1080p Broadcast</span>
              </div>
              <div className="flex items-center space-x-4">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Neural Synthesis</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={(!prompt.trim() && !startImage) || isGenerating}
              className={`min-w-[320px] flex items-center justify-center space-x-5 px-14 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl transition-all shadow-2xl shadow-indigo-500/20 disabled:bg-gray-800 disabled:text-gray-600 uppercase tracking-[0.2em] text-xs active:scale-95`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Processing... {progress}%</span>
                </>
              ) : (
                <>
                  <Film className="w-6 h-6" />
                  <span>{t.startProduction}</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-gray-500 uppercase tracking-[0.4em] italic">Studio Archive</label>
            <div className="h-px flex-1 bg-gray-800/50 mx-10"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-20">
            {videos.length === 0 ? (
              <div className="py-48 text-center border-2 border-dashed border-gray-800/50 rounded-[64px] opacity-10 flex flex-col items-center justify-center group hover:opacity-20 transition-opacity">
                <Clapperboard className="w-24 h-24 mb-8" />
                <p className="font-black uppercase tracking-[0.5em] text-sm italic">Empty Cinema Vault</p>
              </div>
            ) : (
              videos.map((vid) => (
                <div key={vid.id} className="bg-[#070b14]/50 border border-gray-800 rounded-[72px] overflow-hidden shadow-2xl group animate-in slide-in-from-bottom-12 duration-1000">
                  <div className="relative aspect-video bg-black/40 backdrop-blur-3xl overflow-hidden">
                    <video 
                      src={vid.url} 
                      className="w-full h-full object-contain" 
                      controls 
                      onLoadedMetadata={(e) => {
                        const duration = e.currentTarget.duration;
                        updateTrim(vid.id, vid.trimStart || 0, duration);
                      }}
                    />
                    <div className="absolute top-10 left-10">
                       <div className="px-5 py-2.5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 flex items-center space-x-4">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white italic">Master Grade Output</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-16 space-y-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                      <div className="space-y-4 flex-1">
                        <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest flex items-center space-x-3 italic">
                          <Clock className="w-4 h-4" />
                          <span>Vision Script</span>
                        </p>
                        <p className="text-gray-100 font-bold italic text-3xl leading-relaxed">"{vid.prompt}"</p>
                      </div>
                      
                      <div className="flex items-center space-x-5 shrink-0">
                        <button 
                          onClick={() => handleExport(vid)}
                          className="flex items-center space-x-5 px-12 py-6 bg-white text-black font-black rounded-3xl hover:bg-indigo-50 transition-all text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95"
                        >
                          <Download className="w-5 h-5" />
                          <span>Export MP4</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-12 border-t border-gray-800/50 space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-5">
                          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner">
                            <Scissors className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-white uppercase tracking-widest">Temporal Trimming</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Adjust in/out sequence markers</p>
                          </div>
                        </div>
                        <div className="flex space-x-5 text-xs font-mono text-indigo-400 bg-indigo-500/5 px-6 py-3 rounded-2xl border border-indigo-500/10 shadow-inner">
                          <span>IN: {vid.trimStart?.toFixed(1)}s</span>
                          <div className="w-px h-full bg-indigo-500/20"></div>
                          <span>OUT: {vid.trimEnd?.toFixed(1)}s</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-5">
                          <div className="flex justify-between items-center px-2">
                             <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest italic">In Point</label>
                             <span className="text-[11px] font-mono text-gray-400">{vid.trimStart?.toFixed(1)}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max={vid.trimEnd || 10} 
                            step="0.1"
                            value={vid.trimStart || 0}
                            onChange={(e) => updateTrim(vid.id, parseFloat(e.target.value), vid.trimEnd || 10)}
                            className="w-full h-3 bg-gray-950 rounded-full appearance-none cursor-pointer accent-indigo-500 border border-gray-800 shadow-inner"
                          />
                        </div>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center px-2">
                             <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest italic">Out Point</label>
                             <span className="text-[11px] font-mono text-gray-400">{vid.trimEnd?.toFixed(1)}s</span>
                          </div>
                          <input 
                            type="range" 
                            min={vid.trimStart || 0} 
                            max="20" 
                            step="0.1"
                            value={vid.trimEnd || 10}
                            onChange={(e) => updateTrim(vid.id, vid.trimStart || 0, parseFloat(e.target.value))}
                            className="w-full h-3 bg-gray-950 rounded-full appearance-none cursor-pointer accent-indigo-500 border border-gray-800 shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
