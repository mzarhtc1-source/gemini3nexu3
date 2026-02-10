
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Globe, MapPin, Zap, Activity, Brain, Image as ImageIcon, Video, Mic, StopCircle, Paperclip, X, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage, Language } from '../types';
import { translations } from '../translations';

interface IntelligentChatProps {
  language: Language;
}

export const IntelligentChat: React.FC<IntelligentChatProps> = ({ language }) => {
  const t = translations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<'gemini-2.5-flash-lite' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gemini-2.5-flash'>('gemini-3-pro-preview');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(true);
  const [attachments, setAttachments] = useState<{data: string, mimeType: string, type: 'image' | 'video'}[]>([]);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      setAttachments(prev => [...prev, { data: base64, mimeType: file.type, type: type as any }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startTranscription = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          await transcribeAudio(base64);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const transcribeAudio = async (base64: string) => {
    setIsThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { parts: [{ inlineData: { data: base64, mimeType: 'audio/wav' } }, { text: "Transcribe this audio exactly." }] }
        ]
      });
      setInput(prev => prev + (prev ? ' ' : '') + (response.text || ''));
    } catch (err) {
      console.error("Transcription failed", err);
    } finally {
      setIsThinking(false);
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isThinking) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      content: input || (attachments.length > 0 ? "[Media Upload]" : ""), 
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsThinking(true);
    setGroundingSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const tools: any[] = [];
      if (useSearch && model === 'gemini-3-flash-preview') tools.push({ googleSearch: {} });
      if (useMaps && model === 'gemini-2.5-flash') tools.push({ googleMaps: {} });

      const parts: any[] = currentAttachments.map(a => ({
        inlineData: { data: a.data, mimeType: a.mimeType }
      }));
      parts.push({ text: currentInput || "Analyze this content." });

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts }],
        config: {
          tools,
          ...(model === 'gemini-3-pro-preview' && useThinking ? { 
            thinkingConfig: { thinkingBudget: 32768 } 
          } : {})
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) setGroundingSources(chunks);

      const modelMsg: ChatMessage = { 
        role: 'model', 
        content: response.text || 'Synthesis complete.', 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error('Nexus error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Uplink failure. Please retry.', timestamp: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#030712]">
      <header className="px-10 py-6 border-b border-gray-800 bg-[#070b14]/90 backdrop-blur-3xl flex items-center justify-between z-20 shadow-2xl">
        <div className="flex items-center space-x-5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-black text-xl tracking-tight text-white uppercase italic">{t.intelligentChat}</h2>
            <div className="flex items-center space-x-2 mt-1">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">{t.coreActive}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-950/80 p-1.5 rounded-2xl border border-gray-800">
            {model === 'gemini-3-pro-preview' && (
              <button
                onClick={() => setUseThinking(!useThinking)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${useThinking ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                title="Thinking Mode (32k budget)"
              >
                <Brain className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Think</span>
              </button>
            )}
            <button
              onClick={() => { setUseSearch(!useSearch); setModel('gemini-3-flash-preview'); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${useSearch && model === 'gemini-3-flash-preview' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'text-gray-600 border-transparent'}`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Search</span>
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-gray-950 p-1.5 rounded-2xl border border-gray-800">
            {[
              { id: 'gemini-2.5-flash-lite', label: 'Fast' },
              { id: 'gemini-3-flash-preview', label: 'Flash' },
              { id: 'gemini-3-pro-preview', label: 'Pro' },
              { id: 'gemini-2.5-flash', label: 'Maps' }
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => setModel(m.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${model === m.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'text-gray-600 hover:text-gray-200'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-12">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-10">
            <div className="w-32 h-32 rounded-[48px] bg-indigo-600/5 border border-indigo-500/10 flex items-center justify-center relative">
               <Zap className="w-12 h-12 text-indigo-400" />
               <div className="absolute inset-0 bg-indigo-500/5 blur-[60px] rounded-full animate-pulse"></div>
            </div>
            <div className="max-w-xl space-y-4">
              <h3 className="text-4xl font-black tracking-tighter text-white uppercase italic">Neural Interface</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                {language === 'PL' ? 'Zacznij od: "Przeanalizuj to zdjęcie", "Najnowsze wieści AI" lub "Zaplanuj trasę w Londynie".' : 'Try: "Analyze this image", "Get latest AI news", or "Plan a route in London".'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[80%] px-8 py-6 rounded-[32px] border shadow-2xl ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none border-white/10' : 'bg-[#070b14]/80 backdrop-blur-3xl border-gray-800 text-gray-100 rounded-tl-none'
              }`}>
                <div className="text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
                
                {msg.role === 'model' && i === messages.length - 1 && groundingSources.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-800/50 space-y-4">
                    <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                      <Globe className="w-3 h-3" />
                      <span>Verified Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {groundingSources.map((s, idx) => (
                        <a key={idx} href={s.web?.uri || s.maps?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-[10px] text-gray-400 hover:text-white hover:border-indigo-500 transition-all">
                          <span>{s.web?.title || s.maps?.title || 'Source'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isThinking && (
          <div className="flex flex-col items-start">
            <div className="bg-[#070b14]/80 backdrop-blur-3xl border border-gray-800 px-8 py-6 rounded-[32px] rounded-tl-none flex flex-col space-y-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                {model === 'gemini-3-pro-preview' && useThinking ? 'Deep Thinking Mode...' : 'Processing...'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-gray-800 bg-[#070b14]/95 backdrop-blur-3xl">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isRecording ? "Listening..." : t.promptPlaceholder}
              className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 rounded-[28px] px-8 py-6 pr-44 text-gray-100 resize-none h-20 min-h-[80px] transition-all text-lg font-medium shadow-inner"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-900 text-gray-400 hover:text-white rounded-2xl transition-all" title="Upload Media">
                <Paperclip className="w-5 h-5" />
              </button>
              <button onClick={handleSend} disabled={(!input.trim() && attachments.length === 0) || isThinking} className={`p-4 rounded-2xl transition-all shadow-2xl ${!input.trim() && attachments.length === 0 ? 'bg-gray-800 text-gray-600' : 'bg-indigo-600 text-white shadow-indigo-600/30 active:scale-95'}`}>
                {isThinking ? <Activity className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};