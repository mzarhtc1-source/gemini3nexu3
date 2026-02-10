
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Wand2, Maximize2, RefreshCw, Layers, Monitor, Zap, Download, Key } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedImage } from '../types';

export const StudioImages: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [model, setModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-3-pro-image-preview');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [creations, setCreations] = useState<GeneratedImage[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const aspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

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

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setAuthError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { 
            aspectRatio: aspectRatio as any,
            ...(model === 'gemini-3-pro-image-preview' ? { imageSize } : {})
          }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const newImage: GeneratedImage = {
            id: Math.random().toString(36).substr(2, 9),
            url: `data:image/png;base64,${part.inlineData.data}`,
            prompt,
            aspectRatio,
            timestamp: Date.now()
          };
          setCreations(prev => [newImage, ...prev]);
          setPrompt('');
        }
      }
    } catch (error: any) {
      console.error('Imaging error:', error);
      const msg = error.message || "";
      if (msg.includes('401') || msg.includes('API keys are not supported') || msg.includes('Requested entity was not found')) {
        setAuthError("Pro Image requires a PAID project key. Please select a valid key from a billing-enabled project.");
        setHasKey(false);
      } else {
        setAuthError("Generation failed: " + msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (model === 'gemini-3-pro-image-preview' && (hasKey === false || authError)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#030712] text-center">
        <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="p-6 bg-indigo-500/10 rounded-[32px] w-24 h-24 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            <Key className="w-12 h-12 text-indigo-400" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">4K Pro Unlocked</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              {authError || "Professional Gemini 3 Pro imaging requires a selected API key from a PAID Google Cloud project."}
            </p>
            <div className="pt-2">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:underline font-bold uppercase tracking-widest"
              >
                Learn about Billing
              </a>
            </div>
          </div>
          <button onClick={handleSelectKey} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs">
            Select Pro Workspace Key
          </button>
          <button onClick={() => { setModel('gemini-2.5-flash-image'); setAuthError(null); setHasKey(true); }} className="text-gray-500 text-xs font-bold hover:text-indigo-400 uppercase tracking-widest">
            Continue with Standard Flash Engine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800/50 pb-8">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
               <div className="p-2 bg-indigo-500 rounded-xl">
                  <Monitor className="w-5 h-5 text-white" />
               </div>
               <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">Studio Visuals</h2>
            </div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest flex items-center space-x-2">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Multi-Aspect Neural Imaging</span>
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-gray-950 p-1.5 rounded-2xl border border-gray-800">
            <button onClick={() => setModel('gemini-2.5-flash-image')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${model === 'gemini-2.5-flash-image' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-200'}`}>Standard</button>
            <button onClick={() => setModel('gemini-3-pro-image-preview')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${model === 'gemini-3-pro-image-preview' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-200'}`}>Pro 3</button>
          </div>
        </header>

        <div className="bg-gray-900/40 border border-gray-800 rounded-[40px] p-10 backdrop-blur-md shadow-2xl space-y-10">
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Creation Concept</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. Surreal digital art of a futuristic city in the clouds, cyberpunk aesthetics, cinematic lighting, ultra-detailed..."
              className="w-full bg-gray-950/50 border border-gray-800 rounded-3xl p-8 text-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all min-h-[140px] text-xl font-medium leading-relaxed"
            />
          </div>

          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div className="flex flex-wrap gap-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Aspect Ratio</label>
                <div className="flex flex-wrap gap-2 p-1.5 bg-gray-950/80 rounded-2xl border border-gray-800">
                  {aspectRatios.map((ratio) => (
                    <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${aspectRatio === ratio ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-200'}`}>{ratio}</button>
                  ))}
                </div>
              </div>

              {model === 'gemini-3-pro-image-preview' && (
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Render Quality</label>
                  <div className="flex gap-2 p-1.5 bg-gray-950/80 rounded-2xl border border-gray-800">
                    {['1K', '2K', '4K'].map((size) => (
                      <button key={size} onClick={() => setImageSize(size as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${imageSize === size ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-200'}`}>{size}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className={`flex items-center space-x-4 px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${isGenerating ? 'bg-gray-800 text-gray-500' : 'bg-white text-black hover:bg-indigo-50'}`}>
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              <span>{isGenerating ? 'Synthesizing...' : 'Render Masterpiece'}</span>
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {creations.map((img) => (
            <div key={img.id} className="group relative bg-[#070b14] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl hover:border-indigo-500 transition-all duration-500">
              <img src={img.url} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-[1s]" />
              <div className="p-6 space-y-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-sm text-gray-300 font-medium italic line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">"{img.prompt}"</p>
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-widest">{img.aspectRatio}</span>
                  <button className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"><Download className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
