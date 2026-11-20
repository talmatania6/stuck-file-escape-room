import { useEffect, useRef, useState } from 'react';
import { useGame, useUI } from '../game/store';
import { ROOMS, layerLabel } from '../game/rooms';
import { IconClose } from './Icons';

/*
 * Admin / teacher panel. Opens from the small lock button (every screen) or Ctrl+Shift+M.
 * The password is checked against a SHA-256 hash, so it isn't written in the code –
 * but this is a light classroom lock, not real security: the game runs entirely in
 * the browser. To change the password, put the SHA-256 of the new one in ADMIN_HASH.
 * Default password: osi2026
 */
const ADMIN_HASH = 'daf22f688511682bb4038263605252c305a9bb33d7f3274b823610ccd74d8a0c';
const SESSION_KEY = 'stuck-file-admin';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Login({ onOk }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const input = useRef();
  useEffect(() => input.current?.focus(), []);
  return (
    <form
      className="admin-login"
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await sha256(pw)) === ADMIN_HASH) {
          try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
          onOk();
        } else {
          setErr(true);
          setPw('');
        }
      }}
    >
      <label htmlFor="admin-pw">סיסמת מנהלים</label>
      <input id="admin-pw" ref={input} type="password" dir="ltr" value={pw} onChange={(e) => { setPw(e.target.value); setErr(false); }} autoComplete="off" />
      {err && <p className="feedback error">סיסמה שגויה.</p>}
      <button type="submit" className="btn">כניסה</button>
    </form>
  );
}

function Panel() {
  const g = useGame();
  const close = () => useUI.getState().setAdminOpen(false);
  const go = (screen, room) => {
    const ui = useUI.getState();
    ui.closeOverlay();
    ui.setSuccessOpen(false);
    ui.setStandpoint('center');
    g.adminGo(screen, room);
  };
  return (
    <div className="admin-body">
      <section>
        <h3>מעבר מהיר</h3>
        <div className="admin-grid">
          <button type="button" onClick={() => go('start')}>מסך פתיחה</button>
          <button type="button" onClick={() => go('onboarding')}>איך משחקים</button>
          <button type="button" onClick={() => go('hub')}>אולם הליבה</button>
          {ROOMS.map((r) => (
            <button key={r.n} type="button" className={g.screen === 'room' && g.currentRoom === r.n ? 'on' : ''} onClick={() => go('room', r.n)}>
              {r.n === 8 ? 'חדר הבקרה (שכבה 8)' : `${layerLabel(r.n)} · ${r.he}`}
            </button>
          ))}
          <button type="button" onClick={() => go('victory')}>מסך ניצחון</button>
        </div>
      </section>
      <section>
        <h3>זמן</h3>
        <label className="admin-toggle">
          <input type="checkbox" checked={g.practice} onChange={(e) => g.adminTimer(e.target.checked)} />
          <span>בלי טיימר (מצב תרגול)</span>
        </label>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={g.adminResetClock}>איפוס השעון ל-20:00</button>
        </div>
      </section>
      <section>
        <h3>דלתות ושכבות</h3>
        <label className="admin-toggle">
          <input type="checkbox" checked={g.adminFree} onChange={(e) => g.adminSetFree(e.target.checked)} />
          <span>כל הדלתות באולם פתוחות</span>
        </label>
        <div className="admin-solved">
          {ROOMS.map((r) => (
            <label key={r.n} className="admin-chip">
              <input type="checkbox" checked={g.solved.includes(r.n)} onChange={(e) => g.adminSetSolved(r.n, e.target.checked)} />
              <span>{r.n === 8 ? '8' : r.code} תוקן</span>
            </label>
          ))}
        </div>
      </section>
      <section className="admin-foot">
        <button type="button" className="btn warn small" onClick={() => { if (window.confirm('למחוק את כל ההתקדמות ולהתחיל מחדש?')) { g.newGame(); close(); } }}>איפוס משחק</button>
        <button type="button" className="link-btn" onClick={() => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } close(); }}>יציאה ממצב מנהל</button>
      </section>
    </div>
  );
}

export function Admin() {
  const open = useUI((s) => s.adminOpen);
  const setOpen = useUI((s) => s.setAdminOpen);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        setUnlocked(isUnlocked());
        setOpen(!useUI.getState().adminOpen);
      } else if (e.key === 'Escape' && useUI.getState().adminOpen) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
  return (
    <>
      <button type="button" className="admin-fab" aria-label="ממשק מנהלים" title="ממשק מנהלים (Ctrl+Shift+M)" onClick={() => { setUnlocked(isUnlocked()); setOpen(!open); }}>
        <LockIcon />
      </button>
      {open && (
        <div className="admin-wrap" role="dialog" aria-modal="true" aria-label="ממשק מנהלים">
          <div className="admin-card">
            <div className="sp-head">
              <strong>ממשק מנהלים</strong>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="סגירה"><IconClose /></button>
            </div>
            {unlocked ? <Panel /> : <Login onOk={() => setUnlocked(true)} />}
          </div>
        </div>
      )}
    </>
  );
}
