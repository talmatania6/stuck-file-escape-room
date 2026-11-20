import { useEffect, useState } from 'react';
import { useGame, useUI } from '../game/store';
import { COMPANION_NAME } from '../game/rooms';
import { companionPortrait } from '../companion/companionSheet';
import { IconBulb, IconClock, IconDoor, IconHand, IconKeyboard, IconMouse, IconSearch } from './Icons';

const STEPS = [
  { icon: <IconMouse />, title: 'מסתובבים', text: 'גוררים את העכבר כדי להסתכל לכל הכיוונים – גם אחורה. אפשר גם עם החיצים במקלדת.' },
  { icon: <IconHand />, title: 'לוחצים על חפצים', text: 'חפץ שאפשר לחקור מקבל הילה עדינה כשעוברים עליו. לוחצים כדי להתקרב, לפתוח או להפעיל.' },
  { icon: <IconSearch />, title: 'אוספים רמזים', text: 'כל מה שמוצאים נשמר ביומן המשימה בצד המסך – לא צריך לזכור בעל פה.' },
  { icon: <IconKeyboard />, title: 'פותרים', text: 'מקלידים תשובה או גוררים פריטים למקום. אפשר לתקן כמה שרוצים לפני הבדיקה.' },
  { icon: <IconDoor />, title: 'חוזרים לאולם', text: 'אחרי שהחידה נפתרת, הדלת נפתחת וחוזרים לאולם הליבה – והדלת הבאה נפתחת.' },
  { icon: <IconBulb />, title: 'נתקעתם?', text: `שאלות ל${COMPANION_NAME}, שמלווה אתכם – בחינם. רמז מגליץ׳ – עולה 2 דקות.` },
];

/** How to play – shown before the clock starts. */
export function Onboarding() {
  const start = useGame((s) => s.startMission);
  const team = useGame((s) => s.team);
  const [face, setFace] = useState(null);
  useEffect(() => { companionPortrait().then(setFace); }, []);
  return (
    <div className="onboarding">
      <div className="ob-card">
        <div className="ob-intro">
          {face && <img className="ob-face" src={face} alt="" />}
          <div>
            <span className="kicker">קבוצת {team}</span>
            <h1>יש לנו בעיה.</h1>
            <p className="lead">הקובץ של נועה נתקע בדרך למרצה. יש לכם <b>20 דקות</b> לעבור את <b>שבע השכבות</b> של הרשת, לתקן מה שגליץ׳ שיבש – ולשלוח אותו לפני חצות.</p>
          </div>
        </div>
        <ol className="ob-steps">
          {STEPS.map((s, i) => (
            <li key={i}>
              <span className="ob-icon">{s.icon}</span>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
        <div className="ob-start">
          <span className="ob-clock"><IconClock /> השעון יתחיל רק כשתלחצו</span>
          <button type="button" className="btn big" onClick={() => { useUI.getState().setStandpoint('center'); start(); }}>יוצאים לדרך</button>
        </div>
      </div>
    </div>
  );
}

/** Coach marks inside the first room: turn around, then click something. */
export function Tutorial() {
  const step = useUI((s) => s.tutorialStep);
  const done = useGame((s) => s.tutorialDone);
  const finish = useGame((s) => s.finishTutorial);
  const busy = useUI((s) => Boolean(s.overlay) || s.successOpen || s.helpOpen || s.journalOpen);
  useEffect(() => {
    if (!done && step >= 2) {
      const t = setTimeout(finish, 3500);
      return () => clearTimeout(t);
    }
  }, [step, done, finish]);
  useEffect(() => {
    if (done) return;
    const t = setTimeout(finish, 45000); // never nag forever
    return () => clearTimeout(t);
  }, [done, finish]);
  if (done || busy) return null;
  const content = [
    { icon: <IconMouse />, text: 'גררו את המסך כדי להסתובב. נסו להסתכל גם אחורה.' },
    { icon: <IconHand />, text: 'יופי. עכשיו לחצו על חפץ שמקבל הילה – למשל המכשיר על שולחן העבודה.' },
    { icon: <IconSearch />, text: 'ככה חוקרים. חלק מהחפצים נפתחים – שווה לבדוק ארונות ומגירות.' },
  ][Math.min(step, 2)];
  return (
    <div className={`coach ${step >= 2 ? 'done' : ''}`} role="status">
      <span className={`coach-icon ${step === 0 ? 'drag' : step === 1 ? 'tap' : ''}`}>{content.icon}</span>
      <span>{content.text}</span>
      <button type="button" className="link-btn" onClick={finish}>דילוג</button>
    </div>
  );
}
