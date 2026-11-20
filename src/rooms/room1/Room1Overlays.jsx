import { useEffect, useRef, useState } from 'react';
import { useGame, useUI, findClue } from '../../game/store';
import { JOURNAL, roomByNumber } from '../../game/rooms';
import { BEEP, playBeeps, sfx } from '../../audio/audio';
import { Device, Feedback } from '../../ui/Device';
import { CODE } from './data';

const R = roomByNumber(1);

/** Little visual replay of the signal: bar lengths, never digits. */
function SignalStrip() {
  const [active, setActive] = useState(-1);
  const timers = useRef([]);
  const play = () => {
    timers.current.forEach(clearTimeout);
    const run = playBeeps(CODE);
    run.timeline.forEach((p, i) => {
      timers.current.push(setTimeout(() => setActive(i), (p.start + 0.3) * 1000));
    });
    timers.current.push(setTimeout(() => setActive(-1), (run.total + 0.4) * 1000));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (
    <div className="signal-strip">
      <button type="button" className="btn ghost small" onClick={play}>השמעה חוזרת</button>
      <div className="bars" aria-label="ייצוג חזותי של האות: פס קצר וארוך לפי משך הצפצוף">
        {CODE.split('').map((b, i) => (
          <span key={i} className={`bar ${i === active ? 'on' : ''}`} style={{ width: `${(b === '1' ? BEEP.long : BEEP.short) * 120}px` }} />
        ))}
      </div>
    </div>
  );
}

function KeypadOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const say = useUI((s) => s.say);
  const solveRoom = useGame((s) => s.solveRoom);
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState(null);
  const [shake, setShake] = useState(false);
  const input = useRef();
  useEffect(() => input.current?.focus(), []);

  const submit = (e) => {
    e.preventDefault();
    if (value.length < 8) {
      sfx.buzz();
      setMsg({ kind: 'error', text: `צריך 8 ספרות. כרגע יש ${value.length}.` });
      return;
    }
    if (value === CODE) {
      sfx.success();
      setMsg({ kind: 'ok', text: 'הקוד התקבל. המתח חוזר.' });
      setTimeout(() => {
        close();
        solveRoom(1);
      }, 700);
    } else {
      sfx.buzz();
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setMsg({ kind: 'error', text: 'לא בדיוק. תבדקו שוב את הסדר.' });
      say('companion', R.lines.wrong);
    }
  };

  return (
    <Device title="לוח הקוד שליד הדלת" subtitle="קוד הפעלה · 8 ספרות" tone="amber">
      <form className={`code-form ${shake ? 'shake' : ''}`} onSubmit={submit}>
        <label htmlFor="code-input">הקוד (רק 0 ו-1)</label>
        <input
          id="code-input"
          ref={input}
          className="code-input"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={value}
          placeholder="________"
          onChange={(e) => {
            setMsg(null);
            setValue(e.target.value.replace(/[^01]/g, '').slice(0, 8));
          }}
        />
        <div className="digit-pad">
          <button type="button" onClick={() => { sfx.key(); setValue((v) => (v + '1').slice(0, 8)); }}>1</button>
          <button type="button" onClick={() => { sfx.key(); setValue((v) => (v + '0').slice(0, 8)); }}>0</button>
          <button type="button" className="small" onClick={() => { sfx.key(); setValue((v) => v.slice(0, -1)); }}>מחיקה</button>
        </div>
        <SignalStrip />
        <div className="device-actions">
          <button type="submit" className="btn">בדיקה</button>
          {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
        </div>
      </form>
    </Device>
  );
}

function NoteOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const entry = JOURNAL['r1-briefing'];
  useEffect(() => {
    findClue('r1-briefing', R.lines.briefing);
    const g = useGame.getState();
    if (g.roomState[1]?.played && !g.roomState[1]?.readySaid) {
      g.setRoomFlag(1, 'readySaid');
      setTimeout(() => useUI.getState().say('companion', R.lines.ready), 3500);
    }
  }, []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={entry.title} onClick={close}>
      <article className="paper" onClick={(e) => e.stopPropagation()}>
        <h2>{entry.title}</h2>
        <p>{entry.lines[0]}</p>
        <p>{entry.lines[1]}</p>
        <ul>
          <li><b>צפצוף קצר</b> = 0</li>
          <li><b>צפצוף ארוך</b> = 1</li>
        </ul>
        <p>{entry.lines[4]}</p>
        <p className="scribble">ותחזירו את הקפה למטבחון!! – ש.</p>
        <p className="paper-note">נשמר ביומן המשימה</p>
        <button type="button" className="btn" onClick={close}>סגירה</button>
      </article>
    </div>
  );
}

export function Room1Overlays() {
  const overlay = useUI((s) => s.overlay);
  if (overlay === 'keypad') return <KeypadOverlay />;
  if (overlay === 'note') return <NoteOverlay />;
  return null;
}
