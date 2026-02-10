
import React, { useState, useRef } from 'react';
import { Volume2, Play, Download, Trash2, Mic2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AudioClip } from '../types';

// Implementation of custom decode function for raw PCM as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Implementation of custom decodeAudioData function for raw PCM as per guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const SpeechStudio: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [clips, setClips] = useState<AudioClip[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const voices = [
    { name: 'Kore', desc: 'Balanced & Clear' },
    { name: 'Puck', desc: 'Warm & Friendly' },
    { name: 'Charon', desc: 'Deep & Authoritative' },
    { name: 'Fenrir', desc: 'Strong & Bright' },
    { name: 'Zephyr', desc: 'Soft & Calm' },
  ];

  const handlePlayClip = async (base64Data: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      // Decode raw PCM data
      const audioBuffer = await decodeAudioData(decode(base64Data), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isSynthesizing) return;

    setIsSynthesizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const newClip: AudioClip = {
          id: Math.random().toString(36).substr(2, 9),
          // Store raw base64 PCM data for manual decoding on play
          url: base64Audio,
          text,
          voice: selectedVoice,
          timestamp: Date.now()
        };
        setClips(prev => [newClip, ...prev]);
        setText('');
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const removeClip = (id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        <header>
          <h2 className="text-3xl font-bold mb-2">Speech Studio</h2>
          <p className="text-gray-400">Transform your text into cinematic high-fidelity voiceovers.</p>
        </header>

        <section className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Speech Script</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your script here. For example: 'Welcome to the future of creative intelligence!'"
                className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl p-6 text-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[160px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="col-span-full">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Select Voice Persona</label>
              </div>
              {voices.map((voice) => (
                <button
                  key={voice.name}
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                    selectedVoice === voice.name 
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_-3px_rgba(79,70,229,0.3)]' 
                      : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800'
                  }`}
                >
                  <span className={`font-bold ${selectedVoice === voice.name ? 'text-indigo-400' : 'text-gray-200'}`}>{voice.name}</span>
                  <span className="text-xs text-gray-500">{voice.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isSynthesizing}
              className="w-full flex items-center justify-center space-x-3 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
            >
              {isSynthesizing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Mic2 className="w-5 h-5" />
                  <span>Generate Voiceover</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Voice Archive</label>
          <div className="space-y-4">
            {clips.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                <p className="text-gray-600">Generate a clip to start your demo soundtrack...</p>
              </div>
            ) : (
              clips.map((clip) => (
                <div key={clip.id} className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl flex items-center justify-between group hover:bg-gray-900/60 transition-colors">
                  <div className="flex items-center space-x-6">
                    <button 
                      onClick={() => handlePlayClip(clip.url)}
                      className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/10"
                    >
                      <Play className="w-5 h-5 ml-1" />
                    </button>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{clip.voice}</span>
                        <span className="text-xs text-gray-600">•</span>
                        <span className="text-xs text-gray-500">{new Date(clip.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-1 max-w-lg">{clip.text}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => removeClip(clip.id)}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
