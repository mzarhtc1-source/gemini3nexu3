
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { IntelligentChat } from './components/IntelligentChat';
import { NexusIntelligence } from './components/NexusIntelligence';
import { LiveNexus } from './components/LiveNexus';
import { SpeechStudio } from './components/SpeechStudio';
import { StudioImages } from './components/StudioImages';
import { VeoCinema } from './components/VeoCinema';
import { NexusPromo } from './components/NexusPromo';
import { View, Language } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.INTELLIGENT_CHAT);
  const [language, setLanguage] = useState<Language>('PL');

  const renderView = () => {
    switch (activeView) {
      case View.INTELLIGENT_CHAT:
        return <IntelligentChat language={language} />;
      case View.NEXUS_INTELLIGENCE:
        return <NexusIntelligence language={language} />;
      case View.LIVE_NEXUS:
        return <LiveNexus />;
      case View.SPEECH_STUDIO:
        return <SpeechStudio />;
      case View.STUDIO_IMAGES:
        return <StudioImages />;
      case View.VEO_CINEMA:
        return <VeoCinema language={language} />;
      case View.NEXUS_PROMO:
        return <NexusPromo />;
      default:
        return <IntelligentChat language={language} />;
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleChangeApiKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  return (
    <div className="flex h-screen bg-[#030712] text-gray-100 overflow-hidden">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        language={language} 
        onLanguageChange={handleLanguageChange}
        onChangeApiKey={handleChangeApiKey}
      />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#030712] via-[#0b1120] to-[#030712]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
        {renderView()}
      </main>
    </div>
  );
};

export default App;
