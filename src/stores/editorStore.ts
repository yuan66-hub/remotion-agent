import { create } from 'zustand';
import type { Instruction } from '@/lib/instructions/types';
import type { Overlay } from '@/lib/instructions/remotion';

interface Video {
  id: string;
  name: string;
  url: string;
  duration: number;
  width: number;
  height: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface EditorState {
  video: Video | null;
  messages: Message[];
  instructions: Instruction[];
  overlays: Overlay[];
  currentTime: number;
  isPlaying: boolean;
  isProcessing: boolean;
  renderJobId: string | null;

  setVideo: (video: Video | null) => void;
  addMessage: (message: Message) => void;
  addInstruction: (instruction: Instruction) => void;
  updateInstruction: (id: string, updates: Partial<Instruction>) => void;
  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setRenderJobId: (jobId: string | null) => void;
  clearMessages: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  video: null,
  messages: [],
  instructions: [],
  overlays: [],
  currentTime: 0,
  isPlaying: false,
  isProcessing: false,
  renderJobId: null,

  setVideo: (video) => set({ video }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  addInstruction: (instruction) => set((state) => ({ instructions: [...state.instructions, instruction] })),
  updateInstruction: (id, updates) => set((state) => ({
    instructions: state.instructions.map((i) => i.id === id ? { ...i, ...updates } : i)
  })),
  addOverlay: (overlay) => set((state) => ({ overlays: [...state.overlays, overlay] })),
  updateOverlay: (id, updates) => set((state) => ({
    overlays: state.overlays.map((o) => o.id === id ? { ...o, ...updates } as Overlay : o)
  })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setRenderJobId: (jobId) => set({ renderJobId: jobId }),
  clearMessages: () => set({ messages: [] }),
}));
