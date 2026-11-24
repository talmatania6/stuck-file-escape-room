import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Player preferences – saved in the browser, separate from game progress. */
export const DEFAULT_SETTINGS = {
  controlMode: 'mouse', // 'mouse' = classic FPS mouse-look (pointer lock) · 'drag' = drag to look
  sensitivity: 1, // 0.3 – 2.5
  invertY: false,
  fov: 72, // field of view, 60 – 90
  walkSpeed: 1, // 0.6 – 1.6
  quality: 'high', // 'high' | 'medium' | 'low'
  autoQuality: true, // step the graphics down automatically if this computer struggles
  narration: true, // Ping reads her lines aloud
};

const ORDER = ['high', 'medium', 'low'];
/** One level down (high → medium → low). Used by auto-quality and after a lost GPU context. */
export function stepDownQuality() {
  const s = useSettings.getState();
  const i = ORDER.indexOf(s.quality);
  if (i >= 0 && i < ORDER.length - 1) s.update({ quality: ORDER[i + 1] });
}

export const useSettings = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: 'stuck-file-settings', version: 1 },
  ),
);

/** What each graphics level turns on. */
export const QUALITY = {
  high: { dpr: [1, 1.5], bloom: true, dust: true, ao: true, shadows: 2048, label: 'גבוהה' },
  medium: { dpr: [1, 1.25], bloom: true, dust: true, shadows: 1024, label: 'רגילה' },
  low: { dpr: [1, 1], bloom: false, dust: false, label: 'חסכונית' },
};

/** Transient UI state: is the mouse locked to the view, and is the settings panel open. */
export const usePointer = create((set) => ({
  locked: false,
  setLocked: (locked) => set({ locked }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
