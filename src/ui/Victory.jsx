import { useEffect, useMemo, useState } from 'react';
import { useGame, elapsedMs, formatTime, resetGame } from '../game/store';
import { ROOMS, layerLabel } from '../game/rooms';
import { sfx } from '../audio/audio';

const BOARD_KEY = 'stuck-file-leaderboard';

function readBoard() {
  try {
    return JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeBoard(list) {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked – the board just won't persist */
  }
}

const LAYERS7 = ROOMS.filter((r) => r.n <= 7);

/** How one message gets wrapped on the way down – each row adds an envelope. */
const JOURNEY = [
  { layers: '5-7', name: 'נתונים', en: 'Data', room: 'הקבלה, חדר הפענוח והמרכזייה', parts: [] },
  { layers: '4', name: 'מקטע', en: 'Segment', room: 'המחסן, החלקים הממוספרים', parts: [{ t: 'TCP', k: 'l4' }] },
  { layers: '3', name: 'מנה', en: 'Packet', room: 'מרכז הניתוב, כתובת IP', parts: [{ t: 'IP', k: 'l3' }, { t: 'TCP', k: 'l4' }] },
  { layers: '2', name: 'מסגרת', en: 'Frame', room: 'חדר המיון, כתובת MAC', parts: [{ t: 'MAC', k: 'l2' }, { t: 'IP', k: 'l3' }, { t: 'TCP', k: 'l4' }], tail: true },
  { layers: '1', name: 'ביטים', en: 'Bits', room: 'חדר החשמל, אותות', bits: true },
];

function Journey() {
  return (
    <section className="v-journey">
      <h2>המסע של הקובץ</h2>
      <p className="muted small">ככה הקובץ של נועה נעטף בדרך למטה. כל שכבה מוסיפה ״מעטפה״ משלה, ואצל המרצה כל שכבה פותחת את המעטפה שלה בדרך למעלה.</p>
      <ol>
        {JOURNEY.map((row, i) => (
          <li key={row.en} style={{ animationDelay: `${0.25 + i * 0.35}s` }}>
            <div className="j-label">
              <b>{row.name} <small dir="ltr">{row.en}</small></b>
              <span>שכבה {row.layers} · {row.room}</span>
            </div>
            <div className="j-stack" dir="ltr">
              {row.bits ? (
                <span className="j-bits">01001101 11010010 00101110 10110001…</span>
              ) : (
                <>
                  {row.parts.map((p) => <span key={p.t} className={`j-hdr ${p.k}`}>{p.t}</span>)}
                  <span className="j-data">הקובץ של נועה</span>
                  {row.tail && <span className="j-hdr l2 tail">FCS</span>}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function summaryHtml({ team, time, hints }) {
  const rows = LAYERS7.map((r) => `<tr><td class="n">${r.code}</td><td><b>${r.he}</b><br><span>${r.en}</span></td><td>${r.learn}</td></tr>`).join('');
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>סיכום: הקובץ התקוע</title>
<style>body{font-family:Heebo,Arial,sans-serif;color:#14202c;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.6}
h1{font-size:30px;margin:0 0 4px}.meta{color:#4a5a6a;margin:0 0 24px}table{width:100%;border-collapse:collapse}
td{border-top:1px solid #d6dde3;padding:10px 8px;vertical-align:top}td.n{font-weight:700;font-size:22px;color:#2a8a96;width:48px}
td span{color:#6a7a8a;font-size:13px;letter-spacing:1px}.dir{margin-top:24px;padding:14px 16px;background:#eef6f7;border-radius:10px}
@media print{body{margin:0}}</style></head><body>
<h1>הקובץ התקוע: דף סיכום</h1><p class="meta">קבוצת ${team} · זמן: ${time} · רמזים: ${hints}</p>
<table>${rows}</table>
<p class="dir"><b>איך מידע עובר ברשת?</b> אצל השולח, המידע עובר מהשכבה ה-7 (יישום) כלפי מטה עד השכבה ה-1 (פיזית), וכל שכבה מוסיפה לו את המידע שלה. אצל המקבל הוא עולה מ-1 עד 7, וכל שכבה מסירה את מה שהוסיפה השכבה המקבילה. הקומות במשחק הן מטאפורה, ברשת אמיתית אין ״מגדל״.</p>
<p class="dir"><b>ומה עם ״שכבה 8״?</b> אין כזאת במודל OSI. זו בדיחה של אנשי מחשבים על טעויות של המשתמש, כמו כתובת מייל עם שגיאת כתיב.</p>
</body></html>`;
}

/** The end: the file goes out at 23:59:58, the tower lights up, results + what we learned. */
export function Victory() {
  const game = useGame();
  const time = formatTime(elapsedMs(game));
  const [board, setBoard] = useState([]);
  const entry = useMemo(() => ({ team: game.team, ms: elapsedMs(game), hints: game.hintsUsed, at: game.finishedAt }), [game]);

  useEffect(() => {
    sfx.success();
    const list = readBoard();
    if (!list.some((e) => e.at === entry.at)) {
      list.push(entry);
      list.sort((a, b) => a.ms - b.ms);
      writeBoard(list.slice(0, 20));
    }
    setBoard(readBoard());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = () => {
    const blob = new Blob([summaryHtml({ team: game.team, time, hints: game.hintsUsed })], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'הקובץ-התקוע-סיכום.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="victory">
      <div className="v-card">
        <div className="v-top">
          <span className="sent-stamp">נשלח · 23:59:58</span>
          <h1>הקובץ הגיע.</h1>
          <p className="lead">שתי שניות לפני חצות. נועה הגישה, והמרצה כבר קיבל.</p>
        </div>
        <div className="v-stats">
          <div><span>קבוצה</span><b>{game.team}</b></div>
          <div><span>זמן</span><b className="amber">{time}</b></div>
          <div><span>רמזים</span><b>{game.hintsUsed}</b></div>
          {game.practice && <div><span>מצב</span><b>תרגול</b></div>}
        </div>
        <Journey />
        <div className="v-body">
          <section className="v-layers">
            <h2>שבע השכבות, במשפט</h2>
            <ol>
              {[...LAYERS7].reverse().map((r) => (
                <li key={r.n}>
                  <span className="v-num">{r.code}</span>
                  <div>
                    <b>{r.he} <small dir="ltr">{r.en}</small></b>
                    <p>{r.learn}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="v-dir">אצל השולח המידע יורד מ-7 עד 1; אצל המקבל הוא עולה מ-1 עד 7. ו״שכבה 8״? אין כזאת: רק בדיחה על טעויות של משתמשים.</p>
          </section>
          <section className="v-board">
            <h2>טבלת שיאים</h2>
            <p className="muted small">דירוג מקומי, רק המשחקים שנשמרו בדפדפן הזה.</p>
            <ol>
              {board.slice(0, 8).map((e, i) => (
                <li key={e.at || i} className={e.at === entry.at ? 'me' : ''}>
                  <span>{i + 1}</span>
                  <b>{e.team}</b>
                  <span className="t">{formatTime(e.ms)}</span>
                  <small>{e.hints} רמזים</small>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="row v-actions">
          <button type="button" className="btn" onClick={download}>הורדת דף סיכום</button>
          <button type="button" className="btn ghost" onClick={() => resetGame()}>משחק חוזר</button>
        </div>
        <p className="fine">דף הסיכום נפתח בדפדפן, ומשם אפשר להדפיס או לשמור כ-PDF.</p>
      </div>
    </div>
  );
}

export { layerLabel };
