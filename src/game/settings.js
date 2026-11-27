import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Player preferences – saved in the browser, separate from game progress. */
export const DEFAULT_SETTINGS = {
  controlMode: 'mouse', // 'mouse' = classic FPS mouse-look (pointer lock) · 'drag' = drag to look
  sensitivity: 1, // 0.3 – 2.5
  invertY: false,
  fov: 72, // field of view, 60 – 90
  walkSpeed: 1, // 0.6 – 1.6
  quality: 'high', // 'ultra' | 'high' | 'medium' | 'low'
  autoQuality: true, // step the graphics down automatically if this computer struggles
  narration: true, // Ping reads her lines aloud
};

const ORDER = ['ultra', 'high', 'medium', 'low'];
/** One level down (ultra → high → medium → low). Used by auto-quality and after a lost GPU context. */
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
    {
      name: 'stuck-file-settings',
      version: 3,
      // older saves may hold 'auto' (a short-lived mode) or an unknown level
      migrate: (old) => {
        const s = { ...DEFAULT_SETTINGS, ...(old || {}) };
        if (!ORDER.includes(s.quality)) s.quality = 'high';
        delete s.autoLevel;
        return s;
      },
    },
  ),
);

/** What each graphics level turns on. */
export const QUALITY = {
  ultra: { dpr: [1, 1.5], bloom: true, dust: true, ao: true, shadows: 2048, msaa: 4, label: 'מקסימלית' },
  high: { dpr: [1, 1.25], bloom: true, dust: true, shadows: 1024, msaa: 4, label: 'גבוהה' },
  medium: { dpr: [1, 1], bloom: true, dust: true, msaa: 2, label: 'רגילה' },
  low: { dpr: [0.7, 0.7], bloom: false, dust: false, label: 'חסכונית' },
};

/** The graphics level in use. */
export const effectiveQuality = (s) => (QUALITY[s.quality] ? s.quality : 'high');
/** Hook: the active QUALITY preset. */
export const useQuality = () => QUALITY[useSettings(effectiveQuality)] || QUALITY.high;

/** Transient UI state: is the mouse locked to the view, and is the settings panel open. */
export const usePointer = create((set) => ({
  locked: false,
  setLocked: (locked) => set({ locked }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
