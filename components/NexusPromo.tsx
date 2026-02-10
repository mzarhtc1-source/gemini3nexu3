
import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Download, Loader2, Youtube, Sparkles, Monitor, Film, Check, AlertCircle, FileText, Wand2, ChevronRight, Clock, Key, Mic, Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

interface ScriptSegment {
  time: string;
  action: string;
  narrative: string;
}

// Helper for PCM audio decoding
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodePCM(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}

export const NexusPromo: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScripting, setIsScripting] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [promoVideoUrl, setPromoVideoUrl] = useState<string | null>(null);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptSegment[] | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const loadingSteps = [
    "Analyzing App Core Capabilities...",
    "Syncing Neural Narratives...",
    "Rendering Cinematic 4K Assets...",
    "Encoding Veo 3.1 Pro Sequence...",
    "Polishing Master Grade Visuals...",
    "Finalizing YouTube-Ready Master..."
  ];

  useEffect(() => {
    const checkKeyStatus = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKeyStatus();
  }, []);

  const handleSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasKey(true);
    setAuthError(null);
  };

  const generateScript = async () => {
    setIsScripting(true);
    setAuthError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "Create a 90-second high-energy YouTube commercial script for 'Gemini 3 Nexus'. The script must be structured for maximum engagement: 0-15s Hook, 15-45s Feature Deep Dive (Chat Thinking, 4K Images, Live Vision), 45-75s Creative Use Cases (Veo Video), 75-90s Call to Action. Return ONLY a JSON array of objects with 'time', 'action', and 'narrative' fields.",
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const parsedScript = JSON.parse(response.text || "[]");
      setScript(parsedScript);
    } catch (error: any) {
      console.error('Scripting failed:', error);
      if (error.message?.includes('401') || error.message?.includes('key')) {
        setAuthError("Auth failed. Ensure you selected a PAID project key.");
        setHasKey(false);
      }
    } finally {
      setIsScripting(false);
    }
  };

  const generateNarration = async () => {
    if (!script) return;
    setIsNarrating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullNarrationText = script.map(s => s.narrative).join(" ");
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this 90-second promotional script with an enthusiastic, professional, and futuristic tech-reviewer tone: ${fullNarrationText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Bright and Strong
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        const decoded = decodeBase64(base64Audio);
        const buffer = await decodePCM(decoded, audioContextRef.current);
        setNarrationUrl(base64Audio);
      }
    } catch (error) {
      console.error('Narration failed:', error);
    } finally {
      setIsNarrating(false);
    }
  };

  const playNarration = async () => {
    if (!narrationUrl) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    const ctx = audioContextRef.current;
    const decoded = decodeBase64(narrationUrl);
    const buffer = await decodePCM(decoded, ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const generatePromo = async () => {
    setIsGenerating(true);
    setProgress(5);
    setStatusMessage(loadingSteps[0]);
    setAuthError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const basePrompt = script 
        ? `A cinematic 90-second YouTube promo video sequence. Visuals: ${script.map(s => s.action).join(". ")}. `
        : "A professional high-end YouTube promotional video for the 'Gemini 3 Nexus' app. ";
      
      const promoPrompt = basePrompt + "Futuristic AI interfaces, glowing neural networks, cinematic 4K landscapes, fast-paced professional editing style. High-end lighting and motion graphics.";

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: promoPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      let pollCount = 0;
      while (!operation.done) {
        pollCount++;
        const progressVal = Math.min(95, 10 + (pollCount * 5));
        setProgress(progressVal);
        setStatusMessage(loadingSteps[Math.floor((progressVal / 100) * loadingSteps.length)]);
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setPromoVideoUrl(URL.createObjectURL(blob));
      }
    } catch (error: any) {
      console.error('Promo generation failed:', error);
      const errorMsg = error.message || "";
      if (errorMsg.includes('401') || errorMsg.includes('API keys are not supported') || errorMsg.includes('Requested entity was not found')) {
        setAuthError("Veo requires a PAID GCP project key. Please select a valid key from a billing-enabled project.");
        setHasKey(false);
      } else {
        setAuthError("Generation failed: " + errorMsg);
      }
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  if (hasKey === false || authError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 bg-[#030712]">
        <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20">
          <Key className="w-16 h-16 text-red-500" />
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">
            {authError ? "Paid Key Required" : "Studio Authorization"}
          </h2>
          <p className="text-gray-400 font-medium">
            {authError || "To use Veo 3.1 and Pro models, you must select an API key from a PAID Google Cloud project."}
          </p>
          <div className="pt-2">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline font-bold uppercase tracking-widest"
            >
              Learn about Billing & Setup
            </a>
          </div>
        </div>
        <button 
          onClick={handleSelectKey} 
          className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all uppercase tracking-widest text-xs"
        >
          Select Paid Project Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-12 overflow-y-auto bg-[#030712]">
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800/50 pb-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-600 rounded-2xl shadow-xl shadow-red-600/20">
                <Youtube className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Nexus Promo Studio</h2>
            </div>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">90-Second Cinematic YouTube Production</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={generateScript}
              disabled={isScripting || isGenerating}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-all shadow-lg"
            >
              {isScripting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              <span>{script ? 'Refine Script' : 'Draft 90s Script'}</span>
            </button>
            <div className="flex items-center space-x-3 bg-gray-950 p-2 rounded-2xl border border-gray-800">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Master Studio Ready</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {/* Master Preview Screen */}
            <div className="aspect-video bg-gray-950 rounded-[48px] border border-gray-800 overflow-hidden shadow-2xl relative group">
              {promoVideoUrl ? (
                <video src={promoVideoUrl} controls className="w-full h-full object-cover" />
              ) : isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 bg-black/60 backdrop-blur-3xl">
                   <div className="relative">
                      <div className="absolute inset-[-20px] bg-indigo-500/20 blur-[40px] rounded-full animate-pulse"></div>
                      <Loader2 className="w-20 h-20 text-indigo-400 animate-spin relative" />
                   </div>
                   <div className="text-center space-y-3 px-8">
                      <p className="text-2xl font-black text-white uppercase italic tracking-widest animate-pulse">{statusMessage}</p>
                      <p className="text-xs text-indigo-400 font-mono tracking-[0.3em]">Master Rendering: {progress}%</p>
                   </div>
                   <div className="w-64 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                   </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                  <PlayCircle className="w-24 h-24 text-gray-500" />
                  <p className="text-sm font-black uppercase tracking-widest text-gray-600">Master Render Preview</p>
                </div>
              )}
              <div className="absolute top-8 left-8 p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center space-x-3">
                 <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-white italic">90s Master Broadcast</span>
              </div>
            </div>

            {/* Production Tools */}
            {script && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                  onClick={generateNarration}
                  disabled={isNarrating || isGenerating}
                  className="flex items-center justify-between p-6 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl group hover:bg-indigo-600/20 transition-all"
                 >
                    <div className="flex items-center space-x-4">
                       <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                          {isNarrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                       </div>
                       <div className="text-left">
                          <p className="text-sm font-black text-white uppercase tracking-tight">Generate Narration</p>
                          <p className="text-[10px] text-indigo-400 font-medium">Synthesize 90s Voiceover</p>
                       </div>
                    </div>
                    {narrationUrl && <Check className="w-5 h-5 text-emerald-500" />}
                 </button>

                 <button 
                  onClick={generatePromo}
                  disabled={isGenerating}
                  className="flex items-center justify-between p-6 bg-red-600/10 border border-red-600/30 rounded-3xl group hover:bg-red-600/20 transition-all"
                 >
                    <div className="flex items-center space-x-4">
                       <div className="p-3 bg-red-600 rounded-xl shadow-lg">
                          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
                       </div>
                       <div className="text-left">
                          <p className="text-sm font-black text-white uppercase tracking-tight">Master Render</p>
                          <p className="text-[10px] text-red-400 font-medium">Cinematic Visual Synthesis</p>
                       </div>
                    </div>
                    {promoVideoUrl && <Check className="w-5 h-5 text-emerald-500" />}
                 </button>
              </div>
            )}

            {/* Script Display */}
            {script && (
              <div className="bg-[#070b14]/50 border border-gray-800 rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-black/20">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">90.0s Narrative Sequence</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {narrationUrl && (
                      <button onClick={playNarration} className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest">
                        <Volume2 className="w-3 h-3" />
                        <span>Review Narration</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-indigo-400">{script.length} CHAPTERS</span>
                  </div>
                </div>
                <div className="p-8 space-y-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {script.map((seg, i) => (
                    <div key={i} className="flex space-x-6 group relative">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)] z-10"></div>
                        <div className="w-px flex-1 bg-gray-800 group-last:bg-transparent mt-2"></div>
                      </div>
                      <div className="flex-1 pb-10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded-md">{seg.time}</span>
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">{seg.action.split(' ')[0]}</span>
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-start space-x-3">
                              <Monitor className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                              <p className="text-sm font-bold text-gray-200 leading-relaxed"><span className="text-gray-500 uppercase text-[10px] mr-2">Visual:</span> {seg.action}</p>
                           </div>
                           <div className="flex items-start space-x-3">
                              <Volume2 className="w-4 h-4 text-indigo-500 mt-1 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-400 italic leading-relaxed"><span className="text-indigo-500/50 uppercase text-[10px] mr-2">VO:</span> "{seg.narrative}"</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="bg-gray-900/40 border border-gray-800 rounded-[40px] p-8 space-y-8 backdrop-blur-md shadow-2xl">
               <div className="space-y-2">
                 <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">90s Production Specs</h3>
                 <p className="text-[10px] text-indigo-400 font-bold">Optimized for High-Retention Algorithms</p>
               </div>
               
               <div className="space-y-8">
                  {[
                    { icon: Wand2, title: "Narrative AI", desc: "Scripting via Gemini 3 Pro" },
                    { icon: Mic, title: "TTS Narration", desc: "Native Audio 2.5 Flash" },
                    { icon: Monitor, title: "UHD Rendering", desc: "1080p Cinematic Master" },
                    { icon: Clock, title: "Pacing Sync", desc: "Retention-first editing" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-5 group">
                      <div className="p-3 bg-gray-950 rounded-2xl border border-gray-800 group-hover:border-indigo-500/50 transition-all duration-300">
                        <item.icon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight mb-1">{item.title}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
               </div>

               <div className="p-6 bg-red-600/5 border border-red-600/10 rounded-3xl space-y-4 shadow-inner">
                  <div className="flex items-center space-x-2 text-red-500">
                     <Youtube className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Creator Insight</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    The 90-second duration is perfect for a detailed walkthrough that still keeps viewer attention. Ensure your visual "Hook" (0-15s) is visually striking.
                  </p>
               </div>
               
               {(promoVideoUrl || narrationUrl) && (
                 <div className="space-y-3">
                   {promoVideoUrl && (
                     <a 
                      href={promoVideoUrl} 
                      download="nexus-90s-promo-master.mp4"
                      className="w-full flex items-center justify-center space-x-4 py-6 bg-red-600 text-white font-black rounded-3xl hover:bg-red-500 transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] uppercase text-xs tracking-widest"
                     >
                        <Download className="w-5 h-5" />
                        <span>Download 4K Master</span>
                     </a>
                   )}
                   {narrationUrl && (
                     <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Narration Clip Ready</p>
                        <button onClick={playNarration} className="text-[10px] text-white font-bold hover:text-indigo-400 transition-colors uppercase">Preview Narration Track</button>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
