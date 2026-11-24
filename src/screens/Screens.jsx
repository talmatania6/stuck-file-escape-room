import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { SafeCanvas } from '../engine/SafeCanvas';
import { logError } from '../game/log';
import { useGame, useUI, leaveRoom } from '../game/store';
import { roomByNumber } from '../game/rooms';
import { ROOM_MODULES } from '../rooms';
import { getCtx, setMuted, sfx, startMusic } from '../audio/audio';
import { LookControls, fpsEvents } from '../engine/LookControls';
import { useQuality } from '../game/settings';
import { ViewHint, SettingsButton } from '../ui/Settings';
import { PostFX } from '../engine/PostFX';
import { SceneEnvironment } from '../engine/Environment';
import { HubScene, HUB_STANDPOINTS } from '../hub/HubScene';
import { HUD } from '../ui/HUD';
import { HelpPanel, Journal, SuccessCard } from '../ui/Panels';
import { Tutorial } from '../ui/Onboarding';
import { JournalTip, RoomTour } from '../ui/Tour';
import { Victory } from '../ui/Victory';
import { NoaScene } from './NoaScene';

function wakeAudio() {
  getCtx();
  setMuted(useGame.getState().muted);
  startMusic();
}

const GL = { antialias: true, powerPreference: 'high-performance' };
const useDpr = () => useQuality().dpr || [1, 1.25];

/* ------------------------------------------------------------------ */

export function StartScreen() {
  const begin = useGame((s) => s.begin);
  const saved = useGame((s) => s.startedAt);
  const savedTeam = useGame((s) => s.team);
  const resumeScreen = useRef(useGame.getState().currentRoom ? 'room' : 'hub');
  const newGame = useGame((s) => s.newGame);
  const setScreen = useGame((s) => s.setScreen);
  const [team, setTeam] = useState('');
  return (
    <div className="start-screen">
      <SafeCanvas label="start" className="bg-canvas" camera={{ fov: 55, position: [2, 1.5, 2] }} dpr={[1, 1.5]} gl={GL}>
        <NoaScene />
        <PostFX strength={0.4} radius={0.3} threshold={1.15} vignette={0.2} />
      </SafeCanvas>
      <SettingsButton className="icon-btn start-settings" />
      <div className="start-shade" aria-hidden="true" />
      <img className="start-ping" src={`${import.meta.env.BASE_URL}assets/ping/ping-front.webp`} alt="" aria-hidden="true" />
      <main className="start-hero">
        <span className="kicker">חדר בריחה · שבע השכבות של הרשת</span>
        <h1>הקובץ התקוע</h1>
        <p className="start-tag">הקובץ של נועה נתקע בדרך למרצה. יש לכם חצי שעה לשחרר אותו.</p>
        <div className="start-meta" aria-label="30 דקות, 7 שכבות">
          <span className="led-compact" dir="ltr" aria-hidden="true"><span className="bt-ghost">88:88</span><span className="bt-live">30<i>:</i>00</span></span>
          <span className="meta-sep" aria-hidden="true" />
          <span className="meta-item"><b>7</b> שכבות לתקן</span>
        </div>
        {saved ? (
          <div className="start-card">
            <p className="resume-hi">היי <b>{savedTeam}</b>, רוצים להמשיך מאיפה שעצרתם?</p>
            <button type="button" className="btn big start-go" onClick={() => { wakeAudio(); setScreen(useGame.getState().finishedAt ? 'victory' : resumeScreen.current); }}>להמשיך</button>
            <button type="button" className="link-btn" onClick={() => useUI.getState().setResetOpen(true)}>להתחיל מחדש</button>
          </div>
        ) : (
          <form className="start-card" onSubmit={(e) => { e.preventDefault(); wakeAudio(); sfx.click(); begin(team); }}>
            <label htmlFor="team">שם הקבוצה</label>
            <input id="team" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="למשל: הנתבים העליזים" maxLength={40} autoComplete="off" />
            <button type="submit" className="btn big start-go">מתחילים</button>
            <p className="fine">השעון יתחיל רק אחרי סרטון הפתיחה.</p>
          </form>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function HubScreen() {
  const dpr = useDpr();
  useEffect(() => {
    useUI.getState().setStandpoint('center');
    useUI.getState().setSuccessOpen(false);
  }, []);
  return (
    <div className="room-screen">
      <SafeCanvas label="hub" className="game-canvas" camera={{ fov: 72, near: 0.05, far: 80 }} dpr={dpr} gl={GL} events={fpsEvents}>
        <Suspense fallback={null}>
          <HubScene />
        </Suspense>
        <LookControls standpoints={HUB_STANDPOINTS} bounds={{ radius: 5.4 }} />
        <PostFX />
      </SafeCanvas>
      <HUD />
      <ViewHint />
      <HelpPanel />
      <Journal />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** A saved game pointing at a room that doesn't exist – log it and send the team to the hub instead of a blank screen. */
function InvalidRoom({ n }) {
  useEffect(() => {
    logError('room screen', `no room module for currentRoom=${n} – returning to the hub`);
    useGame.getState().backToHub();
  }, [n]);
  return null;
}

export function RoomScreen() {
  const dpr = useDpr();
  const n = useGame((s) => s.currentRoom);
  const solved = useGame((s) => s.solved.includes(n));
  const room = roomByNumber(n);
  const mod = ROOM_MODULES[n];
  const wasSolved = useRef(solved);

  useEffect(() => {
    const ui = useUI.getState();
    ui.setStandpoint('center');
    ui.setSuccessOpen(false);
    ui.closeOverlay();
    const t = setTimeout(() => {
      if (useGame.getState().solved.includes(n)) ui.say('companion', 'את השכבה הזאת כבר תיקנו. הדלת מאחוריכם מחזירה לאולם.');
      else ui.speak(room.enter);
    }, 700);
    if (n === 1 && !useGame.getState().tutorialDone) ui.setTutorialStep(0);
    return () => clearTimeout(t);
  }, [n, room]);

  // solved during this visit → let the room react, then show what was learned
  useEffect(() => {
    if (solved && !wasSolved.current) {
      wasSolved.current = true;
      if (n !== 8) {
        const t = setTimeout(() => useUI.getState().setSuccessOpen(true), 2600);
        return () => clearTimeout(t);
      }
    }
  }, [solved, n]);

  if (!mod) return <InvalidRoom n={n} />;
  const { Scene, Overlays } = mod;
  return (
    <div className={`room-screen room-${n}`}>
      <SafeCanvas key={n} label={`room ${n}`} className="game-canvas" camera={{ fov: 72, near: 0.05, far: 80 }} dpr={dpr} gl={GL} events={fpsEvents}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <SceneEnvironment file={mod.env?.file || 'lab.exr'} intensity={mod.env?.intensity ?? 0.22} />
        <LookControls standpoints={mod.standpoints} bounds={mod.bounds} />
        <PostFX />
      </SafeCanvas>
      <HUD room={room} />
      <ViewHint />
      <RoomTitle key={`title-${n}`} room={room} />
      <StandpointNav standpoints={mod.standpoints} />
      {n === 1 && <Tutorial />}
      {n === 1 && <RoomTour />}
      <JournalTip />
      <Overlays />
      <HelpPanel roomN={n} />
      <Journal roomN={n} />
      <SuccessCard roomN={n} onBack={() => leaveRoom(n)} />
    </div>
  );
}

/** Cinematic title card shown for a moment when a room opens. Never blocks clicks. */
function RoomTitle({ room }) {
  // wait until the scene has actually drawn a few frames (shader compile can stall the first ones)
  const [phase, setPhase] = useState('wait');
  useEffect(() => {
    let n = 0, raf;
    const tick = () => {
      if (++n >= 4) setPhase('show');
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (phase !== 'show') return;
    const t = setTimeout(() => setPhase('done'), 2700);
    return () => clearTimeout(t);
  }, [phase]);
  if (phase !== 'show') return null;
  const twist = room.n === 8;
  return (
    <div className="room-title" aria-hidden="true" style={{ '--room-accent': room.accent }}>
      <span className="rt-code" dir="ltr">{twist ? 'CONTROL ROOM' : `LAYER ${room.code} · ${room.en}`}</span>
      <span className="rt-line" />
      <strong className="rt-name">{room.he}</strong>
      <span className="rt-place">{room.place}</span>
    </div>
  );
}

function StandpointNav({ standpoints }) {
  const current = useUI((s) => s.standpoint);
  const set = useUI((s) => s.setStandpoint);
  return (
    <nav className="standpoints" aria-label="מפת החדר: מעבר בין אזורים">
      <span className="sp-title">מפת החדר</span>
      {Object.entries(standpoints).map(([id, sp]) => (
        <button key={id} type="button" className={id === current ? 'active' : ''} aria-pressed={id === current} onClick={() => set(id)}>
          {sp.label}
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */

function OrbitCam() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime * 0.08;
    camera.position.set(Math.sin(t) * 3.2, 1.5, Math.cos(t) * 3.2);
    camera.lookAt(0, 2.6, 0);
  });
  return null;
}

export function VictoryScreen() {
  return (
    <div className="victory-screen">
      <SafeCanvas label="victory" className="bg-canvas" camera={{ fov: 70, position: [0, 1.5, 3] }} dpr={[1, 1.5]} gl={GL}>
        <Suspense fallback={null}>
          <HubScene celebrate />
        </Suspense>
        <OrbitCam />
        <PostFX strength={0.6} radius={0.35} vignette={0.2} />
      </SafeCanvas>
      <Victory />
    </div>
  );
}
