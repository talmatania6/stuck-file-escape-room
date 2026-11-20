import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGame, useUI, leaveRoom } from '../game/store';
import { roomByNumber } from '../game/rooms';
import { ROOM_MODULES } from '../rooms';
import { getCtx, setMuted, sfx, startMusic } from '../audio/audio';
import { LookControls } from '../engine/LookControls';
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
      <Canvas className="bg-canvas" camera={{ fov: 55, position: [2, 1.5, 2] }} dpr={[1, 1.5]} gl={GL}>
        <NoaScene />
      </Canvas>
      <div className="start-panel">
        <span className="kicker">חדר בריחה · שבע השכבות של הרשת</span>
        <h1>הקובץ התקוע</h1>
        <p className="lead">נועה צריכה להגיש עבודה עד חצות. הקובץ נתקע באמצע הדרך – ומישהו בתוך המערכת לא ממש עוזר.</p>
        <div className="start-stats">
          <div className="big-timer" aria-label="20 דקות למשימה">
            <span className="bt-label">הזמן שלכם</span>
            <span className="bt-digits" dir="ltr">
              <span className="bt-ghost" aria-hidden="true">88:88</span>
              <span className="bt-live">20<i>:</i>00</span>
            </span>
          </div>
          <div className="layers-chip"><b>7</b><span>שכבות לתקן</span></div>
        </div>
        {saved ? (
          <div className="resume">
            <p className="resume-hi">היי <b>{savedTeam}</b>, רוצים להמשיך מאיפה שעצרתם?</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => { wakeAudio(); setScreen(useGame.getState().finishedAt ? 'victory' : resumeScreen.current); }}>להמשיך</button>
              <button type="button" className="btn ghost" onClick={newGame}>להתחיל מחדש</button>
            </div>
          </div>
        ) : (
          <form className="team-form" onSubmit={(e) => { e.preventDefault(); wakeAudio(); sfx.click(); begin(team); }}>
            <label htmlFor="team">שם הקבוצה</label>
            <div className="row">
              <input id="team" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="למשל: הנתבים העליזים" maxLength={40} autoComplete="off" />
              <button type="submit" className="btn">הבא</button>
            </div>
            <p className="fine">לפני שמתחילים – הסבר קצר איך משחקים. השעון עוד לא רץ.</p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function HubScreen() {
  useEffect(() => {
    useUI.getState().setStandpoint('center');
    useUI.getState().setSuccessOpen(false);
  }, []);
  return (
    <div className="room-screen">
      <Canvas className="game-canvas" camera={{ fov: 72, near: 0.05, far: 80 }} dpr={[1, 1.5]} gl={GL}>
        <Suspense fallback={null}>
          <HubScene />
        </Suspense>
        <LookControls standpoints={HUB_STANDPOINTS} />
      </Canvas>
      <HUD />
      <HelpPanel />
      <Journal />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function RoomScreen() {
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

  if (!mod) return null;
  const { Scene, Overlays } = mod;
  return (
    <div className={`room-screen room-${n}`}>
      <Canvas key={n} className="game-canvas" camera={{ fov: 72, near: 0.05, far: 80 }} dpr={[1, 1.5]} gl={GL}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <LookControls standpoints={mod.standpoints} />
      </Canvas>
      <HUD room={room} />
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

function StandpointNav({ standpoints }) {
  const current = useUI((s) => s.standpoint);
  const set = useUI((s) => s.setStandpoint);
  return (
    <nav className="standpoints" aria-label="מפת החדר – מעבר בין אזורים">
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
      <Canvas className="bg-canvas" camera={{ fov: 70, position: [0, 1.5, 3] }} dpr={[1, 1.5]} gl={GL}>
        <Suspense fallback={null}>
          <HubScene celebrate />
        </Suspense>
        <OrbitCam />
      </Canvas>
      <Victory />
    </div>
  );
}
