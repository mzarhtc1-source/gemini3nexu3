
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Terminal, Camera, CameraOff, Video, VideoOff, Activity } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

export const LiveNexus: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const startVision = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVisionActive(true);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
    }
  };

  const stopVision = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsVisionActive(false);
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsActive(true);
            const source = audioContextRef.current!.createMediaStreamSource(audioStream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);

            // Handle Vision frames
            if (isVisionActive && videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (!videoRef.current || !ctx || !canvasRef.current) return;
                canvasRef.current.width = videoRef.current.videoWidth || 640;
                canvasRef.current.height = videoRef.current.videoHeight || 480;
                ctx.drawImage(videoRef.current, 0, 0);
                const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
                sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
              }, 1000);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current!;
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => activeSourcesRef.current.delete(source);
              activeSourcesRef.current.add(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            if (message.serverContent?.outputTranscription) {
              setTranscripts(prev => [...prev.slice(-10), `Gemini: ${message.serverContent!.outputTranscription!.text}`]);
            }
            if (message.serverContent?.inputTranscription) {
              setTranscripts(prev => [...prev.slice(-10), `You: ${message.serverContent!.inputTranscription!.text}`]);
            }
          },
          onerror: (e) => console.error('Live error:', e),
          onclose: () => { setIsActive(false); setStatus('idle'); stopVision(); },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: 'You are Nexus Live. You can see through the camera and hear the user. Be observant, friendly, and brief.'
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start Live session:', error);
      setStatus('idle');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      setIsActive(false);
      setStatus('idle');
      stopVision();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#030712] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none"></div>

      <div className="absolute top-0 left-0 w-full p-8 flex items-center justify-between border-b border-gray-800 bg-[#070b14]/50 backdrop-blur-2xl z-20">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-2xl">
            <Activity className={`w-5 h-5 ${isActive ? 'text-indigo-400 animate-pulse' : 'text-gray-500'}`} />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tight">Nexus Live Link</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Multimodal Native Engine</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={isVisionActive ? stopVision : startVision}
            disabled={isActive}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
              isVisionActive 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-xl shadow-indigo-500/10' 
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {isVisionActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{isVisionActive ? 'Vision On' : 'Vision Off'}</span>
          </button>
          <div className="h-4 w-px bg-gray-800"></div>
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-950`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-gray-700'}`}></div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
              {status}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        {/* Visual Feed Section */}
        <div className="relative group">
          <div className="aspect-video bg-gray-950 rounded-[40px] border border-gray-800 overflow-hidden shadow-2xl transition-all duration-700 group-hover:border-indigo-500/30">
            {isVisionActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                <CameraOff className="w-16 h-16" />
                <p className="text-xs font-bold uppercase tracking-widest">Feed Disabled</p>
              </div>
            )}
            {/* Overlay indicators */}
            <div className="absolute top-6 left-6 flex items-center space-x-3">
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Live</span>
              </div>
              {isVisionActive && (
                <div className="px-3 py-1.5 bg-indigo-500/20 backdrop-blur-md rounded-full border border-indigo-500/20 flex items-center space-x-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Vision Sync</span>
                </div>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Interaction Section */}
        <div className="flex flex-col items-center lg:items-start space-y-12">
          <div className="relative">
            {isActive && (
              <div className="absolute inset-[-40px] rounded-full border border-indigo-500/20 animate-[ping_3s_linear_infinite]"></div>
            )}
            <button
              onClick={isActive ? stopSession : startSession}
              disabled={status === 'connecting'}
              className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 transform active:scale-95 shadow-2xl ${
                isActive 
                  ? 'bg-red-500 text-white shadow-red-500/20 rotate-0' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20 hover:scale-105'
              }`}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent"></div>
              {isActive ? <MicOff className="w-16 h-16" /> : <Mic className="w-16 h-16" />}
            </button>
          </div>

          <div className="text-center lg:text-left space-y-6 max-w-sm">
            <h3 className="text-4xl font-black tracking-tight">{isActive ? 'Systems Linked' : 'Initiate Nexus'}</h3>
            <p className="text-gray-500 leading-relaxed font-medium">
              Engage in sub-second latency multimodal conversations. Gemini can now see and hear you simultaneously for a true human-AI interface.
            </p>
            {!isActive && (
              <button 
                onClick={startSession}
                className="group flex items-center space-x-3 px-10 py-4 bg-white text-black font-black rounded-[20px] hover:bg-indigo-50 transition-all shadow-2xl active:scale-[0.98]"
              >
                <span>Link System</span>
                <Activity className="w-5 h-5 group-hover:animate-pulse" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-20">
        <div className="bg-gray-900/60 backdrop-blur-3xl rounded-[32px] border border-gray-800 shadow-2xl overflow-hidden group/terminal hover:border-indigo-500/20 transition-all duration-500">
          <div className="px-8 py-4 border-b border-gray-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Temporal Log Stream</span>
            </div>
            {isActive && <div className="flex items-center space-x-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Synchronized</span></div>}
          </div>
          <div className="h-40 overflow-y-auto p-8 font-mono text-sm space-y-3">
            {transcripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-10">
                <Activity className="w-12 h-12 mb-4" />
                <p className="text-xs uppercase tracking-widest font-bold">Waiting for transmission...</p>
              </div>
            ) : (
              transcripts.map((t, i) => (
                <div key={i} className={`flex space-x-4 animate-in fade-in slide-in-from-left-2 duration-300 ${t.startsWith('You') ? 'text-indigo-400' : 'text-gray-200'}`}>
                  <span className="opacity-20 select-none">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                  <span className="font-bold whitespace-pre-wrap">{t}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
