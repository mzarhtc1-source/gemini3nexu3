
import React, { useState, useRef } from 'react';
import { Sparkles, Brain, FileText, Code, RefreshCw, Loader2, Check, AlertCircle, Copy, Upload } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Language } from '../types';
import { translations } from '../translations';

interface NexusIntelligenceProps {
  language: Language;
}

export const NexusIntelligence: React.FC<NexusIntelligenceProps> = ({ language }) => {
  const t = translations[language];
  const [content, setContent] = useState('');
  const [result, setResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTask, setActiveTask] = useState<'analyze' | 'rewrite' | 'optimize' | null>(null);
  const [attachments, setAttachments] = useState<{data: string, mimeType: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTask = async (task: 'analyze' | 'rewrite' | 'optimize') => {
    if (!content.trim() && attachments.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setActiveTask(task);
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let promptPrefix = "";
      
      switch(task) {
        case 'analyze':
          promptPrefix = "Analyze the provided content deeply. Extract key insights, emotional tone, and a summary of core concepts. If images are provided, incorporate visual details into the context.";
          break;
        case 'rewrite':
          promptPrefix = "Rewrite the input to be more professional, persuasive, and clear. Maintain the original message but elevate the linguistic quality significantly.";
          break;
        case 'optimize':
          promptPrefix = "Analyze the provided content (code or text) and optimize it for efficiency, readability, and performance. Provide technical suggestions for further improvement.";
          break;
      }

      const parts: any[] = attachments.map(a => ({
        inlineData: { data: a.data, mimeType: a.mimeType }
      }));
      parts.push({ text: `${promptPrefix}\n\nCONTENT:\n${content}` });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts }],
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setResult(response.text || "Reasoning complete. No output returned.");
    } catch (error: any) {
      console.error('Intelligence error:', error);
      setResult(`${t.errorOccurred}: ${error.message || "Uplink failed."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setAttachments([{ data: base64, mimeType: file.type }]);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-[#030712]">
      <div className="max-w-5xl mx-auto space-y-12 pb-24">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-800/50 pb-10">
          <div className="space-y-4">
            <div className="flex items-center space-x-5">
               <div className="p-4 bg-indigo-500 rounded-3xl shadow-2xl shadow-indigo-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
               </div>
               <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">{t.nexusIntelligence}</h2>
            </div>
            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[11px] italic">{t.intelligenceDesc}</p>
          </div>
          <div className="flex items-center space-x-4 bg-gray-950 p-3 rounded-3xl border border-gray-800 shadow-inner">
             <Brain className="w-5 h-5 text-purple-400" />
             <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Pro-Reasoning Link</span>
          </div>
        </header>

        <section className="bg-gray-900/40 border border-gray-800 rounded-[56px] p-12 backdrop-blur-3xl shadow-2xl space-y-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between px-6">
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest italic">Input Interface</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-3 text-[11px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Context</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Inject raw data, code, or context for neural processing..."
              className="w-full bg-gray-950/80 border border-gray-800 rounded-[48px] p-10 text-gray-100 focus:border-indigo-500/50 focus:ring-8 focus:ring-indigo-500/5 transition-all min-h-[240px] text-xl font-medium leading-relaxed shadow-inner"
            />
            {attachments.length > 0 && (
              <div className="flex items-center space-x-4 px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl w-fit animate-in fade-in zoom-in duration-300">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Media Context Locked</span>
                <button onClick={() => setAttachments([])} className="text-gray-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { id: 'analyze', label: t.analyzeTask, icon: FileText, color: 'bg-indigo-600', shadow: 'shadow-indigo-600/20' },
              { id: 'rewrite', label: t.rewriteTask, icon: RefreshCw, color: 'bg-purple-600', shadow: 'shadow-purple-600/20' },
              { id: 'optimize', label: t.optimizeTask, icon: Code, color: 'bg-emerald-600', shadow: 'shadow-emerald-600/20' }
            ].map((task) => (
              <button
                key={task.id}
                onClick={() => handleTask(task.id as any)}
                disabled={isProcessing}
                className={`flex items-center justify-center space-x-5 px-10 py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                  isProcessing && activeTask === task.id 
                    ? 'bg-gray-800 text-gray-400' 
                    : `${task.color} text-white hover:opacity-90 ${task.shadow}`
                }`}
              >
                {isProcessing && activeTask === task.id ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <task.icon className="w-6 h-6" />
                )}
                <span>{task.label}</span>
              </button>
            ))}
          </div>
        </section>

        {result && (
          <section className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-[#070b14]/50 border border-gray-800 rounded-[64px] overflow-hidden shadow-2xl group">
              <div className="p-10 border-b border-gray-800/50 flex items-center justify-between bg-black/20 backdrop-blur-3xl">
                 <div className="flex items-center space-x-5">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner">
                       <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Synthesis Result</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">Refined by Gemini 3 Pro Engine</p>
                    </div>
                 </div>
                 <button 
                  onClick={copyToClipboard}
                  className="p-4 bg-gray-950 border border-gray-800 rounded-2xl text-gray-400 hover:text-white hover:border-indigo-500 transition-all shadow-inner active:scale-90"
                 >
                    <Copy className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-12">
                <div className="prose prose-invert max-w-none text-gray-200 text-xl leading-relaxed font-medium whitespace-pre-wrap">
                  {result}
                </div>
              </div>
            </div>
          </section>
        )}

        {isProcessing && !result && (
          <div className="py-24 flex flex-col items-center justify-center space-y-8 opacity-30 animate-pulse">
            <Brain className="w-24 h-24 text-indigo-500 animate-bounce duration-[2s]" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-[0.6em] italic">Synthesizing Reason...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
