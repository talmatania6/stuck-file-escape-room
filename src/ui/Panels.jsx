import { useEffect, useRef, useState } from 'react';
import { useGame, useUI, formatTime, remainingMs, elapsedMs } from '../game/store';
import { COMPANION_NAME, GENERIC_HELP, GLITCH_NO_MORE, JOURNAL, ROOMS, roomByNumber, layerLabel } from '../game/rooms';
import { sfx } from '../audio/audio';
import { companionPortrait } from '../companion/companionSheet';
import { IconBulb, IconClose, IconFile } from './Icons';
import { usePointer } from '../game/settings';

/* ------------------------------------------------------------------ */
/* "נתקענו?" – free clarifications from the companion + paid Glitch hints */
/* ------------------------------------------------------------------ */

function answer(room, text) {
  for (const it of room.help.intents) if (it.match.test(text)) return it.reply;
  if (/(שכבה|תפקיד)/.test(text)) return room.learn;
  return GENERIC_HELP.fallback;
}

export function HelpPanel({ roomN }) {
  const open = useUI((s) => s.helpOpen);
  const setOpen = useUI((s) => s.setHelpOpen);
  const room = roomByNumber(roomN || 1);
  const inHub = !roomN;
  const tier = useGame((s) => s.hintTier[room.n] || 0);
  const used = useGame((s) => s.hintsUsed);
  const practice = useGame((s) => s.practice);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [face, setFace] = useState(null);
  const list = useRef();
  useEffect(() => { companionPortrait().then(setFace); }, []);
  useEffect(() => { setMsgs([]); setConfirm(false); }, [roomN]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
  if (!open) return null;

  const ask = (q) => {
    const t = q.trim();
    if (!t) return;
    const reply = inHub
      ? 'באולם צריך רק למצוא את הדלת המוארת וללחוץ עליה. הכפתור ״לדלת הפעילה״ למעלה יסובב אתכם אליה.'
      : answer(room, t);
    setMsgs((m) => [...m, { from: 'p', text: t }, { from: 'c', text: reply }]);
    setText('');
  };
  const hints = room.hints;
  const revealed = hints.slice(0, tier);
  const more = tier < hints.length;

  return (
    <aside className="side-panel help-panel" aria-label="עזרה">
      <div className="sp-head">
        <strong>נתקענו?</strong>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="סגירה"><IconClose /></button>
      </div>
      <section className="help-chat">
        <p className="sp-section">שאלה ל{COMPANION_NAME} <small>(בחינם, לא עולה זמן)</small></p>
        <div className="help-msgs" ref={list} aria-live="polite">
          {msgs.length === 0 && (
            <p className="msg from-c">
              {face && <img src={face} alt="" />}
              <span>{inHub ? 'מה לא ברור?' : `אנחנו ב${room.place}. מה לא ברור?`}</span>
            </p>
          )}
          {msgs.map((m, i) => (
            <p key={i} className={`msg from-${m.from}`}>
              {m.from === 'c' && face && <img src={face} alt="" />}
              <span>{m.text}</span>
            </p>
          ))}
        </div>
        {!inHub && (
          <div className="help-quick">
            {room.help.quick.map((q) => <button type="button" key={q} onClick={() => ask(q)}>{q}</button>)}
          </div>
        )}
        <form className="help-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <label htmlFor="help-input" className="sr-only">שאלה</label>
          <input id="help-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="כתבו שאלה…" autoComplete="off" />
          <button type="submit" className="btn small">שאלה</button>
        </form>
        <p className="fine">תשובות מוכנות מראש לפי מילות מפתח, לא בינה מלאכותית חיה.</p>
      </section>
      {!inHub && (
        <section className="help-hints">
          <p className="sp-section glitchy"><IconBulb /> רמז מגליץ׳ <small>(עולה 2 דקות)</small></p>
          {revealed.length > 0 && (
            <ol className="hint-list">{revealed.map((h, i) => <li key={i}>{h}</li>)}</ol>
          )}
          {more ? (
            confirm ? (
              <div className="confirm">
                <p>{practice ? 'במצב תרגול רמזים לא עולים זמן.' : 'הרמז יוריד 2 דקות מהשעון. בטוח?'}</p>
                <div className="row">
                  <button type="button" className="btn warn small" onClick={() => { useGame.getState().buyHint(room.n); sfx.hint(); setConfirm(false); }}>כן, רמז {practice ? '' : '(2- דק׳)'}</button>
                  <button type="button" className="btn ghost small" onClick={() => setConfirm(false)}>לא עכשיו</button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn-hint" onClick={() => setConfirm(true)}>
                <IconBulb /> {revealed.length ? 'עוד רמז' : 'לקבל רמז'} <small>{tier + 1}/{hints.length}</small>
              </button>
            )
          ) : (
            <p className="muted small">{GLITCH_NO_MORE}</p>
          )}
          <p className="fine">רמזים שנוצלו במשחק: {used}</p>
        </section>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Mission journal – everything found so far, always one click away   */
/* ------------------------------------------------------------------ */

// Clues from another room that matter in this one (the twist needs the staff card from room 7).
const CARRY = { 8: ['r7-email'] };

/** Mission journal – one page per room, so it never piles up. Other rooms are a tab away. */
export function Journal({ roomN }) {
  const open = useUI((s) => s.journalOpen);
  const setOpen = useUI((s) => s.setJournalOpen);
  const journal = useGame((s) => s.journal);
  const solved = useGame((s) => s.solved);
  const roomsWith = ROOMS.filter((r) => journal.some((id) => JOURNAL[id]?.room === r.n)).map((r) => r.n);
  const [tab, setTab] = useState(null);
  useEffect(() => {
    if (open) setTab(roomN || roomsWith[roomsWith.length - 1] || null);
    // reset to the current room each time it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomN]);
  if (!open) return null;
  const tabs = [...new Set([...(roomN ? [roomN] : []), ...roomsWith])].sort((a, b) => a - b);
  const page = tab ?? tabs[0];
  const room = page ? roomByNumber(page) : null;
  const items = page ? [...journal.filter((id) => JOURNAL[id]?.room === page), ...(CARRY[page] || []).filter((id) => journal.includes(id))] : [];
  return (
    <aside className="side-panel journal" aria-label="יומן המשימה">
      <div className="sp-head">
        <strong>יומן המשימה</strong>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="סגירה"><IconClose /></button>
      </div>
      <div className="journal-mission">
        <IconFile />
        <p>
          <b>המשימה:</b> לשלוח את הקובץ של נועה לפני חצות. <span className="muted">תוקנו {solved.filter((n) => n <= 7).length}/7 שכבות.</span>
        </p>
      </div>
      {tabs.length > 0 && (
        <div className="journal-tabs" role="tablist" aria-label="חדרים">
          {tabs.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={n === page} className={n === page ? 'on' : ''} onClick={() => setTab(n)} title={roomByNumber(n).he}>
              {n === 8 ? 'בקרה' : String(n).padStart(2, '0')}
              {n === roomN && <small>כאן</small>}
            </button>
          ))}
        </div>
      )}
      <div className="journal-page">
        {room && <h3>{room.n === 8 ? 'חדר הבקרה' : `${layerLabel(room.n)} · ${room.he}`}</h3>}
        {items.length === 0 && <p className="muted journal-empty">עוד לא מצאתם כאן כלום. מה שתמצאו בחדר הזה יישמר בעמוד הזה.</p>}
        {items.map((id) => {
          const e = JOURNAL[id];
          return (
            <article key={id} className="journal-entry">
              <h4>{e.title}</h4>
              {e.lines.map((l, i) => <p key={i} dir={e.ltr ? 'ltr' : undefined}>{l}</p>)}
            </article>
          );
        })}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* After each puzzle: the file piece is released + what we learned     */
/* ------------------------------------------------------------------ */

export function SuccessCard({ roomN, onBack }) {
  const open = useUI((s) => s.successOpen);
  const solved = useGame((s) => s.solved);
  const room = roomByNumber(roomN);
  useEffect(() => {
    if (open) sfx.fragment();
  }, [open]);
  if (!open || roomN === 8) return null;
  return (
    <div className="success" role="dialog" aria-label="השכבה תוקנה">
      <div className="success-card">
        <div className="fragments" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n} className={`frag ${solved.includes(n) ? 'on' : ''} ${n === roomN ? 'new' : ''}`} />
          ))}
        </div>
        <span className="kicker">{layerLabel(room.n)} · {room.en} · תוקן</span>
        <h2>{room.lines.solved}</h2>
        <p className="learned"><b>מה למדנו:</b> {room.learn}</p>
        <div className="row">
          <button type="button" className="btn" onClick={onBack}>חזרה לאולם הליבה</button>
          <button type="button" className="btn ghost" onClick={() => useUI.getState().setSuccessOpen(false)}>להישאר עוד רגע בחדר</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TimeUp() {
  const game = useGame();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  if (!game.startedAt || game.practice || game.finishedAt || !['hub', 'room'].includes(game.screen)) return null;
  if (remainingMs(game, now) > 0) return null;
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label="הזמן נגמר">
      <div className="modal">
        <h2>נגמר הזמן</h2>
        <p>חצות עברה, והקובץ עוד לא יצא. המשימה התחרותית הסתיימה, אבל אפשר להמשיך לפתור את השכבות במצב תרגול, בלי שעון.</p>
        <div className="row">
          <button type="button" className="btn" onClick={game.enterPractice}>להמשיך במצב תרגול</button>
        </div>
      </div>
    </div>
  );
}

export function HoverLabel() {
  const label = useUI((s) => s.hovered);
  const locked = usePointer((s) => s.locked);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  if (!label) return null;
  // with the mouse locked, the label sits just under the crosshair
  const at = locked ? { left: window.innerWidth / 2 + 18, top: window.innerHeight / 2 + 16 } : { left: pos.x + 18, top: pos.y + 16 };
  return <div className="hover-label" style={at}>{label}</div>;
}

export function Fade() {
  const fading = useUI((s) => s.fading);
  return <div className={`fade ${fading ? 'on' : ''}`} aria-hidden="true" />;
}

export { elapsedMs, formatTime };
