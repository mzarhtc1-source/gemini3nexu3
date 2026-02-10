
import React from 'react';
import { 
  Mic2, 
  Volume2, 
  Image as ImageIcon, 
  Film, 
  Cpu,
  PlayCircle,
  Key,
  Globe,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { View, Language } from '../types';
import { translations } from '../translations';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onChangeApiKey: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  language, 
  onLanguageChange,
  onChangeApiKey 
}) => {
  const t = translations[language];

  const navItems = [
    { id: View.INTELLIGENT_CHAT, label: t.intelligentChat, icon: MessageCircle },
    { id: View.NEXUS_INTELLIGENCE, label: t.nexusIntelligence, icon: Sparkles },
    { id: View.LIVE_NEXUS, label: t.liveNexus, icon: Mic2 },
    { id: View.SPEECH_STUDIO, label: t.speechStudio, icon: Volume2 },
    { id: View.STUDIO_IMAGES, label: t.studioImages, icon: ImageIcon },
    { id: View.VEO_CINEMA, label: t.veoCinema, icon: Film },
    { id: View.NEXUS_PROMO, label: t.nexusPromo, icon: PlayCircle },
  ];

  const langs: Language[] = ['EN', 'PL', 'DE', 'ES'];

  return (
    <aside className="w-72 border-r border-gray-800 bg-[#070b14] flex flex-col z-20">
      <div className="p-8 flex items-center space-x-4">
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-bold text-2xl tracking-tight text-white italic leading-none">NEXUS <span className="text-indigo-500 font-black">3</span></h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center space-x-3 px-5 py-4 rounded-[20px] transition-all duration-300 group ${
              activeView === item.id 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)]' 
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border border-transparent'
            }`}
          >
            <item.icon className={`w-5 h-5 transition-colors ${activeView === item.id ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
            <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 space-y-6 border-t border-gray-800 bg-black/20">
        <div className="space-y-3">
           <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center space-x-2 px-2">
              <Globe className="w-3 h-3" />
              <span>Language</span>
           </label>
           <div className="grid grid-cols-2 gap-2">
              {langs.map(l => (
                <button 
                  key={l}
                  onClick={() => onLanguageChange(l)}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${language === l ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'}`}
                >
                  {l}
                </button>
              ))}
           </div>
        </div>

        <button 
          onClick={onChangeApiKey}
          className="w-full flex items-center justify-center space-x-3 px-5 py-4 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black text-indigo-400 hover:bg-indigo-600/10 transition-all uppercase tracking-[0.2em] shadow-inner"
        >
          <Key className="w-4 h-4" />
          <span>{t.changeKey}</span>
        </button>

        <div className="p-5 rounded-2xl bg-gray-800/20 border border-gray-700/30 backdrop-blur-sm">
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.4em] font-black mb-3 italic">{t.systemStatus}</p>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">{t.coreActive}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
