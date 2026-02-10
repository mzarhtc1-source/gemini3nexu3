
export enum View {
  INTELLIGENT_CHAT = 'INTELLIGENT_CHAT',
  NEXUS_INTELLIGENCE = 'NEXUS_INTELLIGENCE',
  LIVE_NEXUS = 'LIVE_NEXUS',
  SPEECH_STUDIO = 'SPEECH_STUDIO',
  STUDIO_IMAGES = 'STUDIO_IMAGES',
  VEO_CINEMA = 'VEO_CINEMA',
  NEXUS_PROMO = 'NEXUS_PROMO'
}

export type Language = 'EN' | 'PL' | 'DE' | 'ES';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  timestamp: number;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
  rawVideoData?: any;
}

export interface AudioClip {
  id: string;
  url: string;
  text: string;
  voice: string;
  timestamp: number;
}
