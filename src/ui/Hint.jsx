import { useEffect } from 'react';
import { useGame, useUI } from '../game/store';
import { GUIDES, roomByNumber, layerLabel } from '../game/rooms';
import { IconBulb, IconCheck, IconClose } from './Icons';

/**
 * The "רמז" panel: what to do in the current room/task, step by step.
 * Closed by default, opens from the HUD (or from inside a puzzle), and ticks off steps
 * as they're done. Paid Glitch hints stay one click further away.
 */
export function HintPanel() {
  const open = useUI((s) => s.hintOpen);
  const setOpen = useUI((s) => s.setHintOpen);
  const game = useGame();
  const inRoom = game.screen === 'room';
  const room = inRoom ? roomByNumber(game.currentRoom) : null;
  const steps = (inRoom ? GUIDES[game.currentRoom] : GUIDES.hub) || [];
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
  useEffect(() => { if (!['hub', 'room'].includes(game.screen)) setOpen(false); }, [game.screen, setOpen]);
  if (!open || !['hub', 'room'].includes(game.screen)) return null;
  const firstOpen = steps.findIndex((s) => !(s.done && s.done(game)));
  return (
    <aside className="hint-pop" role="dialog" aria-label="רמז – מה עושים כאן">
      <div className="hint-head">
        <span className="hint-icon"><IconBulb /></span>
        <div>
          <small>{inRoom ? (room.n === 8 ? 'חדר הבקרה' : `${layerLabel(room.n)} · ${room.he}`) : 'אולם הליבה'}</small>
          <strong>{inRoom ? room.objective : 'להגיע לדלת הבאה'}</strong>
        </div>
        <button type="button" className="icon-btn small" onClick={() => setOpen(false)} aria-label="סגירת הרמז"><IconClose /></button>
      </div>
      <ol className="hint-steps">
        {steps.map((s, i) => {
          const done = s.done ? s.done(game) : false;
          return (
            <li key={i} className={done ? 'done' : i === firstOpen ? 'now' : ''}>
              <span className="hs-mark">{done ? <IconCheck size={13} /> : i + 1}</span>
              <span>{s.text}</span>
            </li>
          );
        })}
      </ol>
      {inRoom && (
        <button type="button" className="link-btn hint-more" onClick={() => { setOpen(false); useUI.getState().setHelpOpen(true); }}>
          עדיין תקועים? שאלה לפינג (חינם) או רמז מגליץ׳ (2 דק׳)
        </button>
      )}
    </aside>
  );
}

/** The button – used in the HUD and inside puzzle devices. */
export function HintButton({ compact }) {
  const open = useUI((s) => s.hintOpen);
  const setOpen = useUI((s) => s.setHintOpen);
  return (
    <button type="button" className={`hud-btn hint-btn ${open ? 'on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)} title="רמז: מה עושים כאן">
      <IconBulb />
      {!compact && <span>רמז</span>}
    </button>
  );
}
