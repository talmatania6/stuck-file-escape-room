import { useEffect, useState } from 'react';
import { HintButton } from './Hint';
import { useGame, useUI, remainingMs, formatTime, leaveRoom } from '../game/store';
import { layerLabel } from '../game/rooms';
import { setMuted, setTension } from '../audio/audio';
import { doorPos } from '../hub/HubScene';
import { IconBook, IconCompass, IconDoor, IconHelp, IconMute, IconSound } from './Icons';
import { SettingsButton } from './Settings';

export function useNow(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function Timer() {
  const game = useGame();
  const now = useNow();
  const rem = remainingMs(game, now);
  useEffect(() => {
    setTension(rem > 10 * 60000 ? 0 : rem > 5 * 60000 ? 1 : 2);
  }, [rem]);
  if (game.practice) return <span className="timer practice">מצב תרגול</span>;
  return (
    <span className={`timer ${rem < 5 * 60000 ? 'urgent' : ''}`} role="timer" aria-label={`זמן שנותר ${formatTime(rem)}`}>
      {formatTime(rem)}
    </span>
  );
}

export function SettingsButtons() {
  const muted = useGame((s) => s.muted);
  const g = useGame.getState;
  return (
    <>
      <button type="button" className="icon-btn" aria-pressed={muted} aria-label={muted ? 'הפעלת סאונד' : 'השתקת סאונד'} title={muted ? 'הפעלת סאונד' : 'השתקה'}
        onClick={() => { g().setMuted(!muted); setMuted(!muted); }}>
        {muted ? <IconMute /> : <IconSound />}
      </button>
      <SettingsButton />
    </>
  );
}

/** The stuck file, in seven pieces: one lights up per layer fixed. */
export function FileProgress() {
  const solved = useGame((s) => s.solved);
  const k = solved.filter((n) => n <= 7).length;
  return (
    <div className="file-progress" aria-label={`${k} מתוך 7 שכבות תוקנו`}>
      <span className="fp-label">הקובץ של נועה</span>
      <div className="fp-bar">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const next = !solved.includes(n) && [1, 2, 3, 4, 5, 6, 7].find((k) => !solved.includes(k)) === n;
          return <span key={n} className={`fp-seg ${solved.includes(n) ? 'on' : ''} ${next ? 'next' : ''}`} title={layerLabel(n)}>{n}</span>;
        })}
      </div>
      <span className="fp-count">{k}/7</span>
    </div>
  );
}

function JournalButton() {
  const open = useUI((s) => s.journalOpen);
  const set = useUI((s) => s.setJournalOpen);
  const ping = useUI((s) => s.journalPing);
  const count = useGame((s) => s.journal.length);
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (!ping) return;
    setGlow(true);
    const t = setTimeout(() => setGlow(false), 2600);
    return () => clearTimeout(t);
  }, [ping]);
  return (
    <button type="button" className={`hud-btn journal-btn ${glow ? 'glow' : ''}`} aria-expanded={open} onClick={() => set(!open)}>
      <IconBook />
      <span>יומן</span>
      {count > 0 && <b className="badge">{count}</b>}
    </button>
  );
}

/**
 * Top bar. Right: where you are and what to do. Centre: the file's progress.
 * Left: time, help, journal, settings. Kept thin so the room stays the star.
 */
export function HUD({ room }) {
  const setHelp = useUI((s) => s.setHelpOpen);
  const lookAt = useUI((s) => s.lookAt);
  const solved = useGame((s) => s.solved);
  const next = [1, 2, 3, 4, 5, 6, 7].find((k) => !solved.includes(k));
  const inRoom = Boolean(room);
  return (
    <header className="hud">
      <div className="hud-where">
        <span className="hud-kicker">{inRoom ? (room.n === 8 ? 'חדר הבקרה' : `${layerLabel(room.n)} · ${room.en}`) : 'אולם הליבה'}</span>
        <strong>{inRoom ? (room.n === 8 ? 'הצעד האחרון' : room.he) : next ? `הדלת הבאה: ${layerLabel(next)}` : 'כל השכבות תקינות'}</strong>
      </div>
      <FileProgress />
      <div className="hud-actions">
        <Timer />
        {!inRoom && next && (
          <button type="button" className="hud-btn" onClick={() => lookAt(doorPos(next))}>
            <IconCompass />
            <span>לדלת הפעילה</span>
          </button>
        )}
        {inRoom && (
          <button type="button" className="hud-btn quiet" onClick={() => leaveRoom(room.n)} title="חזרה לאולם הליבה (ההתקדמות נשמרת)">
            <IconDoor />
            <span>לאולם</span>
          </button>
        )}
        <HintButton />
        <button type="button" className="hud-btn help" onClick={() => setHelp(true)}>
          <IconHelp />
          <span>נתקענו?</span>
        </button>
        <JournalButton />
        <SettingsButtons />
      </div>
    </header>
  );
}
