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

interface CropPreview {
  startTime: number;
  endTime: number;
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
  cropPreview: CropPreview | null;

  setVideo: (video: Video | null) => void;
  setCropPreview: (preview: CropPreview | null) => void;
  addMessage: (message: Message) => void;
  addInstruction: (instruction: Instruction) => void;
  updateInstruction: (id: string, updates: Partial<Instruction>) => void;
  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  deleteTextOverlay: (startTime: number, endTime: number) => string[];
  deleteOverlayByIds: (ids: string[]) => void;
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
  cropPreview: null,

  setVideo: (video) => set({ video }),
  setCropPreview: (preview) => set({ cropPreview: preview }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  addInstruction: (instruction) => set((state) => ({ instructions: [...state.instructions, instruction] })),
  updateInstruction: (id, updates) => set((state) => ({
    instructions: state.instructions.map((i) => i.id === id ? { ...i, ...updates } : i)
  })),
  addOverlay: (overlay) => set((state) => ({ overlays: [...state.overlays, overlay] })),
  updateOverlay: (id, updates) => set((state) => ({
    overlays: state.overlays.map((o) => o.id === id ? { ...o, ...updates } as Overlay : o)
  })),
  deleteTextOverlay: (startTime, endTime) => {
    const deletedIds: string[] = [];
    set((state) => {
      const newOverlays = state.overlays.filter((overlay) => {
        if (overlay.type !== 'text') return true;
        const textOverlay = overlay as { id: string; startTime: number; endTime: number };
        const overlaps = textOverlay.startTime < endTime && textOverlay.endTime > startTime;
        if (overlaps) {
          deletedIds.push(overlay.id);
          return false;
        }
        return true;
      });
      return { overlays: newOverlays };
    });
    return deletedIds;
  },
  deleteOverlayByIds: (ids) => set((state) => ({
    overlays: state.overlays.filter((o) => !ids.includes(o.id))
  })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setRenderJobId: (jobId) => set({ renderJobId: jobId }),
  clearMessages: () => set({ messages: [] }),
}));
