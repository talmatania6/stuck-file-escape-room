import { useEffect, useLayoutEffect, useState } from 'react';
import { useGame, useUI } from '../game/store';

/**
 * Highlights one element on screen: dims everything else, rings the element,
 * and points at it with a bouncing arrow and a short explanation.
 */
function Spotlight({ selector, title, text, step, total, onNext, onSkip, nextLabel = 'הבנתי' }) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    useUI.setState({ spotlight: true });
    return () => useUI.setState({ spotlight: false });
  }, []);
  useLayoutEffect(() => {
    let raf;
    const measure = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect((old) => (old && Math.abs(old.x - r.x) < 0.5 && Math.abs(old.y - r.y) < 0.5 && Math.abs(old.width - r.width) < 0.5 ? old : { x: r.x, y: r.y, width: r.width, height: r.height }));
      } else setRect(null);
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [selector]);
  if (!rect) return null;
  const pad = 8;
  const below = rect.y + rect.height + 200 < window.innerHeight;
  const cardW = Math.min(320, window.innerWidth - 24);
  let left = rect.x + rect.width / 2 - cardW / 2;
  left = Math.max(12, Math.min(window.innerWidth - cardW - 12, left));
  const top = below ? rect.y + rect.height + pad + 46 : Math.max(12, rect.y - pad - 46 - 170);
  const arrowX = rect.x + rect.width / 2;
  return (
    <div className="tour" role="dialog" aria-live="polite" aria-label={title}>
      <div className="tour-ring" style={{ left: rect.x - pad, top: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      <div className={`tour-arrow ${below ? 'up' : 'down'}`} style={{ left: arrowX - 16, top: below ? rect.y + rect.height + pad + 4 : rect.y - pad - 40 }} aria-hidden="true">
        <svg width="32" height="36" viewBox="0 0 32 36"><path d="M16 2 L30 18 H21 V34 H11 V18 H2 Z" fill="currentColor" /></svg>
      </div>
      <div className="tour-card" style={{ left, top, width: cardW }}>
        <b>{title}</b>
        <p>{text}</p>
        <div className="tour-foot">
          {total > 1 && <span className="tour-step">{step}/{total}</span>}
          {onSkip && <button type="button" className="link-btn" onClick={onSkip}>דילוג</button>}
          <button type="button" className="btn small" onClick={onNext}>{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}

const ROOM_TOUR = [
  { selector: '.standpoints', title: 'מפת החדר', text: 'קפיצה מהירה לכל אזור חשוב בחדר, בלי לחפש. אפשר גם ללכת חופשי עם W A S D או החיצים. החפצים עצמם מקבלים הילה כשעוברים עליהם.' },
  { selector: '.hud .timer', title: 'השעון', text: '30 דקות לכל המשימה. הוא ממשיך לרוץ גם באולם ובין החדרים.' },
  { selector: '.file-progress', title: 'הקובץ של נועה', text: 'כל שכבה שתתקנו משחררת חלק מהקובץ. כאן רואים כמה כבר עשיתם.' },
  { selector: '.hud-btn.help', title: 'נתקעתם?', text: 'כאן אפשר לשאול שאלות (בחינם) או לבקש רמז מגליץ׳, שעולה 2 דקות.' },
];

/** First visit to room 1: a short tour of the screen, after the "turn around / click" coach marks. */
export function RoomTour() {
  const tutorialDone = useGame((s) => s.tutorialDone);
  const done = useGame((s) => s.tourDone);
  const finish = useGame((s) => s.finishTour);
  const busy = useUI((s) => Boolean(s.overlay) || s.successOpen || s.helpOpen || s.journalOpen || s.fading || s.hintOpen);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!tutorialDone || done) return;
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, [tutorialDone, done]);
  if (!tutorialDone || done || busy || !ready) return null;
  const s = ROOM_TOUR[i];
  return (
    <Spotlight
      {...s}
      step={i + 1}
      total={ROOM_TOUR.length}
      nextLabel={i === ROOM_TOUR.length - 1 ? 'יאללה, מתחילים' : 'הבא'}
      onNext={() => (i < ROOM_TOUR.length - 1 ? setI(i + 1) : finish())}
      onSkip={finish}
    />
  );
}

/** The first time a clue is saved: point straight at the journal button. */
export function JournalTip() {
  const count = useGame((s) => s.journal.length);
  const done = useGame((s) => s.journalTipDone);
  const finish = useGame((s) => s.finishJournalTip);
  const busy = useUI((s) => Boolean(s.overlay) || s.successOpen || s.helpOpen || s.fading || s.hintOpen);
  const journalOpen = useUI((s) => s.journalOpen);
  const tourRunning = useGame((s) => s.currentRoom === 1 && s.tutorialDone && !s.tourDone);
  useEffect(() => {
    if (journalOpen && count > 0 && !done) finish();
  }, [journalOpen, count, done, finish]);
  if (done || count === 0 || busy || tourRunning) return null;
  return (
    <Spotlight
      selector=".journal-btn"
      title="נשמר ביומן!"
      text="כל רמז שמוצאים נשמר כאן, לכל חדר בנפרד. לא צריך לחזור אליו בחדר או לזכור בעל פה."
      step={1}
      total={1}
      nextLabel="לפתוח את היומן"
      onNext={() => { finish(); useUI.getState().setJournalOpen(true); }}
      onSkip={finish}
    />
  );
}
