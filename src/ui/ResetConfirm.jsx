import { useEffect, useRef } from 'react';
import { useUI, resetGame } from '../game/store';

/** "Start over?" – the only way the whole game is reset, always behind this confirmation. */
export function ResetConfirm() {
  const open = useUI((s) => s.resetOpen);
  const setOpen = useUI((s) => s.setResetOpen);
  const cancel = useRef();
  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div className="overlay reset-overlay" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-text">
      <div className="modal">
        <h2 id="reset-title">להתחיל מחדש?</h2>
        <p id="reset-text">בטוחים שרוצים להתחיל את המשחק מחדש? כל ההתקדמות תימחק: השכבות שתוקנו, היומן, הרמזים והשעון.</p>
        <div className="row">
          <button type="button" className="btn ghost" ref={cancel} onClick={() => setOpen(false)}>ביטול</button>
          <button type="button" className="btn warn" onClick={resetGame}>כן, להתחיל מחדש</button>
        </div>
      </div>
    </div>
  );
}
