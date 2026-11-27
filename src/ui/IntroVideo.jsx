// The opening video: a short cinematic where Ping tells the story in her own voice
// (clips from tools/intro-video, edge-tts) over real shots of the game, then a quick
// "how to play" montage with on-screen titles, and Ping sends the team off.
// It replaces the old wall of instructions.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame, useUI } from '../game/store';
import { COMPANION_NAME } from '../game/rooms';
import { sfx, setMuted as setAudioMuted } from '../audio/audio';
import { IconClock } from './Icons';

const BASE = import.meta.env.BASE_URL;
const shot = (n) => `${BASE}assets/intro/${n}.webp`;
const clip = (n) => `${BASE}assets/intro/vo/${n}.mp3`;

/**
 * The script. `vo` lines are spoken by Ping (dur = clip length in seconds);
 * `title` lines are on-screen captions for the how-to-play montage.
 */
export const INTRO_LINES = [
  { scene: 'hello', vo: 'l1', dur: 2.57, text: `היי, אני ${COMPANION_NAME}.` },
  { scene: 'story', vo: 'l2', dur: 4.37, text: 'יש לנו בעיה: הקובץ של נועה נתקע בדרך למרצה.' },
  { scene: 'timer', vo: 'l3', dur: 3.58, text: 'ונשארו לנו רק שלושים דקות עד חצות.' },
  { scene: 'layers', vo: 'l4', dur: 6.31, text: 'כדי לשחרר אותו, נעבור יחד את שבע השכבות של הרשת, מהכבל ועד האפליקציה.' },
  { scene: 'glitch', vo: 'l5', dur: 6.05, text: 'גליץ׳ שיבש כל אחת מהן. תחקרו, תפתרו, ותתקנו את מה שהוא קלקל.' },
  { scene: 'look', title: 'מסתכלים מסביב', text: 'לוחצים על המסך ומזיזים את העכבר.' },
  { scene: 'walk', title: 'הולכים', text: 'המקשים W A S D או החיצים.' },
  { scene: 'use', title: 'חוקרים', text: 'חפץ עם מסגרת זוהרת? לוחצים עליו כדי להתקרב, לפתוח או להפעיל.' },
  { scene: 'journal', title: 'אוספים רמזים', text: 'כל מה שמוצאים נשמר ביומן.' },
  { scene: 'door', title: 'פותרים', text: 'הדלת נפתחת, וחוזרים לאולם הליבה בשביל השכבה הבאה.' },
  { scene: 'help', title: 'נתקעתם?', text: `שאלות ל${COMPANION_NAME} בחינם. רמז מגליץ׳ עולה שתי דקות.` },
  { scene: 'withyou', vo: 'l6', dur: 3.07, text: 'ואני אהיה איתכם לאורך כל הדרך.' },
  { scene: 'go', vo: 'l7', dur: 4.87, text: 'מוכנים? השעון מתחיל לרוץ. יוצאים לדרך!' },
];

const wordsOf = (t) => t.split(/\s+/).filter(Boolean);
/** How long each beat stays on screen. */
const beat = (l) => (l.vo ? l.dur + 0.75 : Math.max(3.2, wordsOf(l.text).length * 0.34 + 1.6));

/**
 * Each scene: background shot + a slow camera move (scale, x%, y% from → to),
 * plus overlays. `anchored` overlays live in image space and move with the shot.
 */
const SCENES = {
  hello: { bg: 'hub_wide', from: [1.32, 7, 3], to: [1.2, 7, 1] },
  story: { bg: 'hub_wide', from: [1.2, 7, 1], to: [1.3, 2, -1] },
  timer: { bg: 'hub_wide', from: [1.3, 2, -1], to: [1.45, 0, -2] },
  layers: { bg: 'hub_done', from: [1.08, 0, 0], to: [1.3, 0, -2] },
  glitch: { bg: 'r3_wide', from: [1.1, 3, 0], to: [1.28, 4, 2] },
  look: { bg: 'r1_wide', from: [1.2, 6, 0], to: [1.2, -6, 0] },
  walk: { bg: 'r2_wide', from: [1.04, 0, 0], to: [1.3, 0, 1.5] },
  use: { bg: 'r1_wide', from: [1.25, 2, -3.5], to: [1.6, 3.5, -4.5] },
  journal: { bg: 'r4_shelves', from: [1.12, 3, 0], to: [1.2, -3, 0] },
  door: { bg: 'hub_done', from: [1.05, 0, 0], to: [1.4, 0, -2] },
  help: { bg: 'r3_wide', from: [1.22, -2, 0], to: [1.12, 2, 0] },
  withyou: { bg: 'hub_wide', from: [1.18, 6, 0], to: [1.26, 7, 1] },
  go: { bg: 'hub_wide', from: [1.36, 7, -2], to: [1.2, 7, 0] },
};

/* ---------------- overlays ---------------- */

function OHello() {
  return (
    <div className="iv-o iv-title">
      <span className="iv-kicker">חדר בריחה · שבע השכבות של הרשת</span>
      <h1 data-text="הקובץ התקוע">הקובץ התקוע</h1>
    </div>
  );
}

function OStoryFile() {
  return (
    <div className="iv-o iv-filechip-wrap">
      <div className="iv-glass iv-filechip">
        <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
        <div><b dir="ltr">final-project.pdf</b><span>נתקע בדרך · 63%</span></div>
        <span className="iv-stuck">!</span>
      </div>
    </div>
  );
}

function OTimer() {
  return (
    <div className="iv-o iv-title go">
      <span className="iv-kicker">הזמן עד חצות</span>
      <div className="iv-bigclock"><IconClock /> 30:00</div>
    </div>
  );
}

function OGlitch() {
  return (
    <div className="iv-o iv-glitch-wrap">
      <div className="iv-glitch" data-text="גליץ׳">גליץ׳</div>
      <span className="iv-kicker red">שיבש את כל שבע השכבות</span>
    </div>
  );
}

const LAYERS = ['פיזית', 'קו', 'רשת', 'תעבורה', 'שיחה', 'ייצוג', 'יישום'];
function OStory() {
  return (
    <div className="iv-o iv-story">
      <div className="iv-glass iv-stack">
        {LAYERS.map((l, i) => (
          <div key={l} className="iv-layer" style={{ animationDelay: `${0.5 + i * 0.36}s` }}>
            <span className="iv-num">{String(i + 1).padStart(2, '0')}</span>
            <span>{l}</span>
            <span className="iv-dot" />
          </div>
        ))}
        <div className="iv-file" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
        </div>
      </div>
    </div>
  );
}

function OLook() {
  return (
    <>
      <span className="iv-cross" />
      <div className="iv-o iv-chip-bottom">
        <div className="iv-glass iv-hint">
          <svg className="iv-mouse" viewBox="0 0 40 60"><rect x="4" y="4" width="32" height="52" rx="16" /><path d="M20 4v18" /><rect className="iv-mbtn" x="4.5" y="4.5" width="15" height="17.5" rx="8" /></svg>
        </div>
      </div>
    </>
  );
}

function OWalk() {
  const keys = ['W', 'A', 'S', 'D'];
  return (
    <div className="iv-o iv-chip-bottom">
      <div className="iv-glass iv-keysbox">
        <div className="iv-keys" dir="ltr">
          {keys.map((k, i) => <span key={k} className={`iv-key k${i}`} style={{ animationDelay: `${0.5 + i * 0.5}s` }}>{k}</span>)}
        </div>
        <span className="iv-or">או</span>
        <div className="iv-keys" dir="ltr">
          {['↑', '←', '↓', '→'].map((k, i) => <span key={k} className={`iv-key k${i}`} style={{ animationDelay: `${2.7 + i * 0.35}s` }}>{k}</span>)}
        </div>
      </div>
    </div>
  );
}

function OUseAnchored() {
  return (
    <>
      <span className="iv-cross aim" />
      <span className="iv-outline" />
      <span className="iv-tag">לוח חשמל ראשי: פתיחה</span>
      <span className="iv-ripple" />
    </>
  );
}
function OUse() { return null; }

function OJournal() {
  return (
    <div className="iv-o iv-journal">
      <div className="iv-clue">
        <span className="iv-clue-k">רמז חדש</span>
        <b>MAC של המחשב של נועה</b>
        <span dir="ltr" className="iv-mono">F0:18:98:4D:7A:02</span>
      </div>
      <div className="iv-glass iv-book">
        <svg viewBox="0 0 24 24"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></svg>
        <span>יומן</span>
        <b className="iv-badge">1</b>
      </div>
    </div>
  );
}

function ODoor() {
  return (
    <div className="iv-o iv-door">
      <div className="iv-glass iv-solved"><span className="iv-check">✓</span> השכבה תוקנה. הדלת הבאה נפתחה</div>
    </div>
  );
}

function OHelp() {
  return (
    <div className="iv-o iv-help">
      <div className="iv-glass iv-opt free"><b>{COMPANION_NAME}</b><span>שאלות בחינם</span></div>
      <div className="iv-glass iv-opt glitch"><b>רמז מגליץ׳</b><span dir="ltr">−2:00</span></div>
    </div>
  );
}

function OGo() {
  return (
    <div className="iv-o iv-title go">
      <span className="iv-kicker">השעון מתחיל כשתלחצו</span>
      <div className="iv-bigclock"><IconClock /> 30:00</div>
    </div>
  );
}

const Nothing = () => null;
const OVERLAY = { hello: OHello, story: OStoryFile, timer: OTimer, layers: OStory, glitch: OGlitch, look: OLook, walk: OWalk, use: OUse, journal: OJournal, door: ODoor, help: OHelp, withyou: Nothing, go: OGo };
const ANCHORED = { use: OUseAnchored };

/** One shot with its camera move; image-space overlays ride along. */
function Shot({ name, dur, leaving }) {
  const sc = SCENES[name];
  const A = ANCHORED[name];
  const [s0, x0, y0] = sc.from;
  const [s1, x1, y1] = sc.to;
  return (
    <div className={`iv-shot iv-shot-${name}${leaving ? ' out' : ''}`}>
      <div
        className="iv-frame"
        style={{ '--s0': s0, '--x0': `${x0}%`, '--y0': `${y0}%`, '--s1': s1, '--x1': `${x1}%`, '--y1': `${y1}%`, '--d': `${dur}s` }}
      >
        <img src={shot(sc.bg)} alt="" draggable="false" />
        {A && <A />}
      </div>
    </div>
  );
}

/* ---------------- player ---------------- */

export function IntroVideo() {
  const start = useGame((s) => s.startMission);
  const team = useGame((s) => s.team);
  const muted = useGame((s) => s.muted);
  const calm = useGame((s) => s.reduceMotion);

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const clock = useRef({ t: 0, last: 0 });
  const music = useRef(null);
  const clips = useRef({});
  const current = useRef(null);

  const timeline = useMemo(() => {
    let at = 0.8;
    const starts = INTRO_LINES.map((l) => { const s0 = at; at += beat(l); return s0; });
    return { starts, total: at + 0.2 };
  }, []);

  // preload every shot and voice clip so nothing pops in late
  useEffect(() => {
    Object.values(SCENES).forEach((sc) => { const i = new Image(); i.src = shot(sc.bg); });
    INTRO_LINES.forEach((l) => { if (l.vo) { const a = new Audio(clip(l.vo)); a.preload = 'auto'; clips.current[l.vo] = a; } });
    return () => Object.values(clips.current).forEach((a) => a.pause());
  }, []);

  // music bed, ducked while Ping speaks
  useEffect(() => {
    const m = new Audio(`${BASE}assets/intro/intro-music.mp3`);
    m.volume = 0;
    music.current = m;
    m.play().catch(() => {});
    return () => m.pause();
  }, []);
  useEffect(() => {
    if (music.current) music.current.muted = muted;
    Object.values(clips.current).forEach((a) => { a.muted = muted; });
  }, [muted]);
  useEffect(() => {
    const m = music.current;
    if (!m || ended) return;
    if (playing) { m.play().catch(() => {}); current.current?.play().catch(() => {}); } else { m.pause(); current.current?.pause(); }
  }, [playing, ended]);

  // the clock
  useEffect(() => {
    if (ended || !playing) return undefined;
    let raf;
    const tick = (now) => {
      const c = clock.current;
      c.t += Math.min(0.1, (now - (c.last || now)) / 1000);
      c.last = now;
      setT(c.t);
      if (c.t >= timeline.total) { setEnded(true); return; }
      raf = requestAnimationFrame(tick);
    };
    clock.current.last = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ended, timeline.total]);

  let idx = -1;
  while (idx < INTRO_LINES.length - 1 && t >= timeline.starts[idx + 1]) idx++;
  const line = INTRO_LINES[Math.max(0, idx)];
  const sceneName = ended ? 'go' : line.scene;
  const sinceLine = t - timeline.starts[Math.max(0, idx)];
  const voiced = Boolean(line.vo);
  const speaking = !ended && playing && idx >= 0 && voiced && sinceLine < line.dur;

  // start each line's voice clip as its beat begins
  const spoken = useRef(-1);
  useEffect(() => {
    if (idx < 0 || idx === spoken.current || ended) return;
    spoken.current = idx;
    current.current?.pause();
    const l = INTRO_LINES[idx];
    const a = l.vo ? clips.current[l.vo] : null;
    current.current = a;
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  }, [idx, ended]);

  // music level: softer under the voice, fuller in the montage
  useEffect(() => {
    const m = music.current;
    if (!m) return undefined;
    const target = ended ? 0.35 : voiced ? 0.2 : 0.5;
    const id = setInterval(() => {
      const d = target - m.volume;
      if (Math.abs(d) < 0.02) { m.volume = target; clearInterval(id); } else m.volume = Math.max(0, Math.min(1, m.volume + Math.sign(d) * 0.02));
    }, 40);
    return () => clearInterval(id);
  }, [voiced, ended]);

  // keep the previous shot for a cross-fade, and punctuate each cut
  const [shots, setShots] = useState([{ id: 0, name: 'hello' }]);
  const lastScene = useRef('hello');
  useEffect(() => {
    if (sceneName === lastScene.current) return undefined;
    const prevBg = SCENES[lastScene.current]?.bg;
    lastScene.current = sceneName;
    setShots((s) => [{ ...s[s.length - 1], leaving: true }, { id: s[s.length - 1].id + 1, name: sceneName }]);
    if (!ended && prevBg !== SCENES[sceneName].bg) sfx.whoosh();
    const id = setTimeout(() => setShots((s) => s.filter((x) => !x.leaving)), 1100);
    return () => clearTimeout(id);
  }, [sceneName, ended]);
  useEffect(() => { if (ended) sfx.impact(); }, [ended]);

  const go = useCallback(() => {
    current.current?.pause();
    const m = music.current;
    if (m) { const id = setInterval(() => { m.volume = Math.max(0, m.volume - 0.05); if (m.volume <= 0) { clearInterval(id); m.pause(); } }, 60); }
    useUI.getState().setStandpoint('center');
    start();
  }, [start]);
  const replay = () => {
    clock.current.t = 0;
    spoken.current = -1;
    current.current?.pause();
    if (music.current) { music.current.currentTime = 0; music.current.play().catch(() => {}); }
    lastScene.current = 'hello';
    setShots([{ id: Date.now(), name: 'hello' }]);
    setT(0);
    setEnded(false);
    setPlaying(true);
  };
  const skip = () => { current.current?.pause(); setEnded(true); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !ended) skip();
      if (e.key === ' ' && !ended) { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === 'Enter' && ended) go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const Overlay = OVERLAY[sceneName];
  const lineDur = (timeline.starts[idx + 1] ?? timeline.total) - timeline.starts[Math.max(0, idx)];
  const shotDur = lineDur + 1.6;
  const words = wordsOf(line.text);
  const per = voiced ? Math.max(0.1, (line.dur - 0.3) / words.length) : 0.07;

  return (
    <div className={`cine-intro${calm ? ' calm' : ''}${ended ? ' ended' : ''}${playing || ended ? '' : ' paused'}`}>
      {/* the film */}
      <div className="iv-film">
        {shots.map((s) => <Shot key={s.id} name={s.name} dur={ended ? 14 : shotDur} leaving={s.leaving} />)}
        <div className="iv-grade" />
        <div className="iv-flash" key={`f-${sceneName}`} />
      </div>

      {/* on-screen graphics for this beat */}
      <div className="iv-overlay" key={`o-${sceneName}`}>{!ended && idx >= 0 && <Overlay />}</div>

      {/* Ping, presenting */}
      <div className={`iv-ping${speaking ? ' talking' : ''}`} aria-hidden="true">
        <span className="iv-beam" />
        <span className="iv-pad" />
        <div className="iv-ping-body" style={{ '--ping': `url(${BASE}assets/ping/ping-front.webp)` }}>
          <img className="iv-p-body" src={`${BASE}assets/ping/ping-front.webp`} alt="" />
          <img className="iv-p-head" src={`${BASE}assets/ping/ping-front.webp`} alt="" />
          <span className="iv-scan" />
        </div>
      </div>

      {/* subtitles (Ping) or titles (how to play) */}
      {!ended && idx >= 0 && (
        <div className={`iv-subs${voiced ? '' : ' title'}`} aria-live="polite" key={`s-${idx}`}>
          <span className="iv-speaker">{voiced ? COMPANION_NAME : 'איך משחקים'}</span>
          {!voiced && <h3 className="iv-subtitle-head">{line.title}</h3>}
          <p>
            {words.map((w, i) => (
              <span key={i} style={{ animationDelay: `${Math.min(i * per, 5)}s` }}>{w} </span>
            ))}
          </p>
        </div>
      )}

      {/* end card */}
      {ended && (
        <div className="iv-end">
          <span className="iv-kicker">קבוצת {team}</span>
          <h2>הכול מוכן. נועה סומכת עליכם שתשלחו את הקובץ בזמן.</h2>
          <div className="iv-end-actions">
            <button type="button" className="btn big" onClick={go} autoFocus>יוצאים לדרך</button>
            <button type="button" className="btn ghost" onClick={replay}>לצפות שוב</button>
          </div>
        </div>
      )}

      {/* player controls */}
      {!ended && (
        <div className="iv-controls">
          <button type="button" className="iv-ctl" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'השהיה' : 'המשך'}>
            {playing ? <svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg> : <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>}
          </button>
          <button type="button" className="iv-ctl" onClick={() => { useGame.getState().setMuted(!muted); setAudioMuted(!muted); }} aria-label={muted ? 'הפעלת סאונד' : 'השתקה'}>
            {muted ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg> : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>}
          </button>
          <button type="button" className="iv-ctl iv-skip" onClick={skip}>דלגו</button>
        </div>
      )}
      <div className="iv-progress"><span style={{ width: `${ended ? 100 : Math.min(100, (t / timeline.total) * 100)}%` }} /></div>
    </div>
  );
}
