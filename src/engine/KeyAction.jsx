import { useEffect } from 'react';
import { create } from 'zustand';
import { useUI } from '../game/store';
import { usePointer } from '../game/settings';

/**
 * Keyboard use: E or Enter does what a click would do on the thing in front of you.
 * Two sources fill the slot: the object under the cursor / crosshair (any Interactable),
 * and in the hall, the door you are standing at. The hovered object wins.
 */
export const useKeyAction = create((set) => ({
  hover: null, // { label, run }
  near: null, // { label, run } – e.g. the closest hall door
  setHover: (hover) => set({ hover }),
  setNear: (near) => set((s) => (s.near?.label === near?.label && Boolean(s.near) === Boolean(near) ? s : { near })),
}));

const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;

/** Global key listener + the small on-screen prompt. Mount once per 3D screen. */
export function KeyActionPrompt() {
  const hover = useKeyAction((s) => s.hover);
  const near = useKeyAction((s) => s.near);
  const busy = useUI((s) => Boolean(s.overlay) || s.helpOpen || s.journalOpen || s.successOpen || s.fading || s.hintOpen);
  const settings = usePointer((s) => s.settingsOpen);
  const act = hover || near;

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'KeyE' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
      if (typing(e) || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // a focused button already reacts to Enter on its own
      if (e.code !== 'KeyE' && e.target?.tagName === 'BUTTON') return;
      const ui = useUI.getState();
      if (ui.overlay || ui.helpOpen || ui.journalOpen || ui.successOpen || ui.fading || usePointer.getState().settingsOpen) return;
      const k = useKeyAction.getState();
      const a = k.hover || k.near;
      if (!a) return;
      e.preventDefault();
      a.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => () => useKeyAction.setState({ hover: null, near: null }), []);

  if (!act || busy || settings) return null;
  return (
    <div className="key-prompt" role="status">
      <kbd>E</kbd>
      <span>{act.label}</span>
    </div>
  );
}
