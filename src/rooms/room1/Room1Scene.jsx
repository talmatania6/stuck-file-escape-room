import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { concrete, metal, wood, hazard, pegboard, grille, sign, lightningIcon } from '../../engine/textures';
import { Interactable } from '../../engine/Interactable';
import { Companion } from '../../companion/Companion';
import { useGame, useUI, leaveRoom, roomFlag } from '../../game/store';
import { roomByNumber } from '../../game/rooms';
import { getCtx, playBeeps, sfx } from '../../audio/audio';
import { CODE } from './data';
import { Scope } from './Scope';
import { Dust } from '../../engine/Atmosphere';
import { KeyLight } from '../../engine/KeyLight';
import { normalTex, grunge } from '../../engine/pbr';

const R = roomByNumber(1);
const LINES = R.lines;

/** "Now just type the code" – once the team has both heard the signal and read the briefing. */
function maybeReady() {
  const g = useGame.getState();
  if (roomFlag(g, 1, 'played') && g.journal.includes('r1-briefing') && !roomFlag(g, 1, 'readySaid') && !g.solved.includes(1)) {
    g.setRoomFlag(1, 'readySaid');
    setTimeout(() => useUI.getState().say('companion', LINES.ready), 2500);
  }
}

const H = 4.2; // ceiling height
const HALF = 4.5; // room is 9 x 9 m
const lerp = THREE.MathUtils.lerp;

/* ------------------------------------------------------------------ */
/* Room shell                                                          */
/* ------------------------------------------------------------------ */

function Shell() {
  const t = useMemo(
    () => ({
      north: concrete([3, 1.4], '#5b6064', 1),
      south: concrete([3, 1.4], '#5b6064', 2),
      west: concrete([3, 1.4], '#596064', 3),
      eastA: concrete([1.1, 1.4], '#596064', 4),
      eastB: concrete([1.45, 1.4], '#596064', 5),
      eastTop: concrete([0.45, 0.6], '#596064', 6),
      floor: concrete([4, 4], '#3a3e41', 7),
      ceil: concrete([3, 3], '#2c3034', 8),
      pillar: concrete([0.3, 1.4], '#62676b', 9),
      trim: metal('#2b3238', 3, [6, 1]),
    }),
    [],
  );
  const relief = useMemo(() => ({ wN: normalTex('concrete', [3, 1.5]), wR: grunge([2, 1]), fN: normalTex('floor-wear', [3, 3]), fR: grunge([2.5, 2.5]), cN: normalTex('concrete', [3, 3]) }), []);
  const wall = (map) => <meshStandardMaterial map={map} roughness={0.95} normalMap={relief.wN} normalScale={[0.7, 0.7]} roughnessMap={relief.wR} />;
  return (
    <group>
      <mesh position={[0, H / 2, -HALF]}>
        <planeGeometry args={[9, H]} />
        {wall(t.north)}
      </mesh>
      <mesh position={[0, H / 2, HALF]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[9, H]} />
        {wall(t.south)}
      </mesh>
      <mesh position={[-HALF, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[9, H]} />
        {wall(t.west)}
      </mesh>
      {/* east wall, built around the door opening (z -1.15 … 0.15, height 2.3) */}
      <mesh position={[HALF, H / 2, -2.825]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[3.35, H]} />
        {wall(t.eastA)}
      </mesh>
      <mesh position={[HALF, H / 2, 2.325]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[4.35, H]} />
        {wall(t.eastB)}
      </mesh>
      <mesh position={[HALF, 3.25, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.3, 1.9]} />
        {wall(t.eastTop)}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={t.floor} roughness={0.78} metalness={0.08} normalMap={relief.fN} normalScale={[0.6, 0.6]} roughnessMap={relief.fR} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={t.ceil} roughness={1} normalMap={relief.cN} normalScale={[0.6, 0.6]} />
      </mesh>
      {/* corner pillars */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 4.28, H / 2, sz * 4.28]}>
          <boxGeometry args={[0.45, H, 0.45]} />
          <meshStandardMaterial map={t.pillar} roughness={0.95} />
        </mesh>
      ))}
      {/* skirting strips */}
      <mesh position={[0, 0.08, -HALF + 0.02]}><boxGeometry args={[9, 0.16, 0.04]} /><meshStandardMaterial map={t.trim} metalness={0.6} roughness={0.5} /></mesh>
      <mesh position={[0, 0.08, HALF - 0.02]}><boxGeometry args={[9, 0.16, 0.04]} /><meshStandardMaterial map={t.trim} metalness={0.6} roughness={0.5} /></mesh>
      <mesh position={[-HALF + 0.02, 0.08, 0]}><boxGeometry args={[0.04, 0.16, 9]} /><meshStandardMaterial map={t.trim} metalness={0.6} roughness={0.5} /></mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ceiling services: beams, pipes, cable tray, conduits                */
/* ------------------------------------------------------------------ */

function Services() {
  const beam = useMemo(() => concrete([3, 0.2], '#4a4f53', 11), []);
  const steel = useMemo(() => metal('#56616b', 12, [4, 1]), []);
  const copper = { color: '#a8673a', metalness: 0.85, roughness: 0.38 };
  return (
    <group>
      {[-1.8, 1.8].map((z) => (
        <mesh key={z} position={[0, H - 0.18, z]}>
          <boxGeometry args={[9, 0.36, 0.32]} />
          <meshStandardMaterial map={beam} roughness={0.95} />
        </mesh>
      ))}
      {/* pipes along the north wall */}
      <mesh position={[0, 3.85, -4.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.075, 9, 20]} />
        <meshStandardMaterial {...copper} />
      </mesh>
      <mesh position={[0, 3.62, -4.22]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 9, 16]} />
        <meshStandardMaterial map={steel} metalness={0.7} roughness={0.45} />
      </mesh>
      {/* pipe along the west wall */}
      <mesh position={[-4.16, 3.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 9, 20]} />
        <meshStandardMaterial map={steel} metalness={0.7} roughness={0.5} />
      </mesh>
      {/* pipe brackets */}
      {[-3.5, -2, -0.5, 1, 2.5, 4].map((x) => (
        <mesh key={x} position={[x, 3.74, -4.3]}>
          <boxGeometry args={[0.05, 0.36, 0.4]} />
          <meshStandardMaterial color="#2d3339" metalness={0.6} roughness={0.6} />
        </mesh>
      ))}
      {/* cable tray along the east wall, with cables */}
      <mesh position={[4.12, 3.55, 0]}>
        <boxGeometry args={[0.42, 0.06, 9]} />
        <meshStandardMaterial map={steel} metalness={0.7} roughness={0.5} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[3.97 + i * 0.07, 3.61, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 9, 8]} />
          <meshStandardMaterial color={['#1b1b1b', '#3a2a24', '#22303d', '#1b1b1b', '#4a4032'][i]} roughness={0.7} />
        </mesh>
      ))}
      {/* conduits from the main cabinet up to the ceiling */}
      {[-2.0, -1.0].map((x) => (
        <mesh key={x} position={[x, (2.2 + H) / 2, -4.4]}>
          <cylinderGeometry args={[0.035, 0.035, H - 2.2, 12]} />
          <meshStandardMaterial color="#6d757c" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Hanging lamps – flicker while the power is out                      */
/* ------------------------------------------------------------------ */

const LAMPS = [[-1.8, -1.0], [1.8, -1.0], [0, 2.4]];
const AMBER = new THREE.Color('#ffa94d');
const WARM = new THREE.Color('#ffe0b5');

function Lamps({ power }) {
  const lights = useRef([]);
  const bulbs = useRef([]);
  const seeds = useMemo(() => LAMPS.map((_, i) => 1.7 + i * 3.1), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = power.current;
    LAMPS.forEach((_, i) => {
      const s = seeds[i];
      let f = 0.6 + 0.4 * Math.sin(t * 11 + s) * Math.sin(t * 6.3 + s * 2);
      if (Math.sin(t * 1.3 + s) > 0.9) f *= 0.12; // drop-outs
      f = THREE.MathUtils.clamp(f, 0.06, 1);
      const intensity = lerp(f * 7, 16, p);
      tmp.copy(AMBER).lerp(WARM, p);
      if (lights.current[i]) {
        lights.current[i].intensity = intensity;
        lights.current[i].color.copy(tmp);
      }
      if (bulbs.current[i]) {
        bulbs.current[i].emissiveIntensity = intensity * 0.6;
        bulbs.current[i].emissive.copy(tmp);
      }
    });
  });
  return LAMPS.map(([x, z], i) => (
    <group key={i} position={[x, 0, z]}>
      <mesh position={[0, (H + 3.3) / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, H - 3.3, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <coneGeometry args={[0.32, 0.24, 28, 1, true]} />
        <meshStandardMaterial color="#3c4a40" metalness={0.6} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.17, 0]}>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshStandardMaterial ref={(el) => (bulbs.current[i] = el)} color="#ffd9a8" emissive="#ffa94d" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <pointLight ref={(el) => (lights.current[i] = el)} position={[0, 3.0, 0]} intensity={3} distance={12} decay={1.2} />
    </group>
  ));
}

/* ------------------------------------------------------------------ */
/* North wall – main electrical cabinet + voltmeter                    */
/* ------------------------------------------------------------------ */

function MainCabinet({ power, solved }) {
  const [open, setOpen] = useState(false);
  const door = useRef();
  const levers = useRef([]);
  const leds = useRef([]);
  const say = useUI((s) => s.say);
  const tex = useMemo(
    () => ({
      body: metal('#4b5863', 21),
      inner: metal('#20272e', 22),
      warning: sign({
        w: 512,
        h: 640,
        bg: '#FFB547',
        border: '#111',
        icon: lightningIcon(256, 200, 130),
        pad: 40,
        align: 'center',
        lines: [
          { text: '', size: 330 },
          { text: 'סכנה! מתח גבוה', size: 56, color: '#111', font: 'Rubik' },
          { text: 'לוח חשמל ראשי · L1', size: 38, color: '#111', weight: 500 },
        ],
      }),
      placardOff: sign({
        w: 1024,
        h: 320,
        bg: '#141b22',
        border: '#3a4652',
        lines: [
          { text: 'המתח נותק', size: 74, color: '#EF6D73', font: 'Rubik' },
          { text: 'להחזרת המתח: הקלידו את קוד האות', size: 46, color: '#DDE8EF', weight: 500 },
          { text: 'בלוח הקוד שליד דלת היציאה', size: 46, color: '#DDE8EF', weight: 500 },
        ],
      }),
      placardOn: sign({
        w: 1024,
        h: 320,
        bg: '#141b22',
        border: '#3a4652',
        lines: [
          { text: 'המתח חובר', size: 74, color: '#65CDAA', font: 'Rubik' },
          { text: 'כל המפסקים במצב פעיל', size: 46, color: '#DDE8EF', weight: 500 },
        ],
      }),
    }),
    [],
  );
  const red = useMemo(() => new THREE.Color('#EF6D73'), []);
  const green = useMemo(() => new THREE.Color('#65CDAA'), []);

  useFrame((_, dt) => {
    if (door.current) {
      const target = open || solved ? -1.95 : 0;
      door.current.rotation.y += (target - door.current.rotation.y) * (1 - Math.exp(-dt * 4));
    }
    const p = power.current;
    levers.current.forEach((l, i) => {
      if (!l) return;
      const on = p > 0.1 + i * 0.09;
      const target = on ? -0.55 : 0.55;
      l.rotation.x += (target - l.rotation.x) * (1 - Math.exp(-dt * 12));
      const led = leds.current[i];
      if (led) led.emissive.copy(on ? green : red);
    });
  });

  const activate = () => {
    if (solved) {
      say('companion', 'הכל דולק. עדיף לא לגעת.');
      return;
    }
    setOpen((o) => !o);
    sfx.creak();
    if (!open) setTimeout(() => say('companion', LINES.cabinet), 700);
  };

  return (
    <group position={[-1.5, 0, -HALF]}>
      <Interactable label={open || solved ? 'לוח חשמל ראשי' : 'לוח חשמל ראשי: פתיחה'} standpoint="cabinet" onActivate={activate}>
        {/* hollow box: back, sides, top, bottom */}
        <mesh position={[0, 1.15, 0.02]}><boxGeometry args={[1.6, 2.0, 0.04]} /><meshStandardMaterial map={tex.inner} metalness={0.5} roughness={0.6} /></mesh>
        <mesh position={[-0.79, 1.15, 0.24]}><boxGeometry args={[0.03, 2.0, 0.46]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0.79, 1.15, 0.24]}><boxGeometry args={[0.03, 2.0, 0.46]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 2.16, 0.24]}><boxGeometry args={[1.62, 0.03, 0.48]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 0.14, 0.24]}><boxGeometry args={[1.62, 0.03, 0.48]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        {/* placard inside */}
        <mesh position={[0, 1.78, 0.05]}>
          <planeGeometry args={[1.3, 0.4]} />
          <meshStandardMaterial map={solved ? tex.placardOn : tex.placardOff} roughness={0.7} />
        </mesh>
        {/* breaker row */}
        {Array.from({ length: 8 }, (_, i) => {
          const x = -0.56 + i * 0.16;
          return (
            <group key={i} position={[x, 1.22, 0.1]}>
              <mesh><boxGeometry args={[0.12, 0.24, 0.1]} /><meshStandardMaterial color="#d9d6cf" roughness={0.55} /></mesh>
              <group ref={(el) => (levers.current[i] = el)} position={[0, 0, 0.06]} rotation={[0.55, 0, 0]}>
                <mesh position={[0, 0.045, 0]}><boxGeometry args={[0.04, 0.09, 0.035]} /><meshStandardMaterial color="#1c1c1c" roughness={0.5} /></mesh>
              </group>
              <mesh position={[0, 0.16, 0.03]} userData={{ noHighlight: true }}>
                <sphereGeometry args={[0.014, 10, 8]} />
                <meshStandardMaterial ref={(el) => (leds.current[i] = el)} color="#222" emissive="#EF6D73" emissiveIntensity={2.2} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
        {/* wiring under the breakers */}
        {['#7a2b2b', '#23394f', '#1a1a1a', '#6b5a2a', '#1a1a1a'].map((c, i) => (
          <mesh key={i} position={[-0.4 + i * 0.2, 0.68, 0.08]}>
            <cylinderGeometry args={[0.012, 0.012, 0.8, 8]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0.1]}><boxGeometry args={[1.3, 0.08, 0.12]} /><meshStandardMaterial color="#2a2f35" metalness={0.5} roughness={0.6} /></mesh>
        {/* door, hinged on the left edge */}
        <group ref={door} position={[-0.8, 1.15, 0.47]}>
          <mesh position={[0.8, 0, 0]}><boxGeometry args={[1.6, 2.0, 0.035]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[0.8, 0.22, 0.019]}><planeGeometry args={[0.62, 0.78]} /><meshStandardMaterial map={tex.warning} roughness={0.7} /></mesh>
          <mesh position={[1.47, -0.05, 0.04]}><boxGeometry args={[0.04, 0.26, 0.05]} /><meshStandardMaterial color="#1c2025" metalness={0.8} roughness={0.3} /></mesh>
          {[0.85, -0.85].map((y) => (
            <mesh key={y} position={[0.02, y, 0]}><cylinderGeometry args={[0.022, 0.022, 0.16, 10]} /><meshStandardMaterial color="#30363c" metalness={0.8} roughness={0.4} /></mesh>
          ))}
        </group>
      </Interactable>
    </group>
  );
}

function Voltmeter({ power, solved }) {
  const needle = useRef();
  const say = useUI((s) => s.say);
  const dial = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#e8e2d2';
    g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222';
    g.lineWidth = 6;
    g.beginPath(); g.arc(256, 300, 170, Math.PI * 1.17, Math.PI * 1.83); g.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 1.17 + (i / 10) * Math.PI * 0.66;
      g.lineWidth = i % 5 === 0 ? 6 : 3;
      g.beginPath();
      g.moveTo(256 + Math.cos(a) * 170, 300 + Math.sin(a) * 170);
      g.lineTo(256 + Math.cos(a) * (i % 5 === 0 ? 135 : 150), 300 + Math.sin(a) * (i % 5 === 0 ? 135 : 150));
      g.stroke();
    }
    g.strokeStyle = '#b5413f';
    g.lineWidth = 10;
    g.beginPath(); g.arc(256, 300, 182, Math.PI * 1.72, Math.PI * 1.83); g.stroke();
    g.fillStyle = '#222';
    g.font = '700 40px Rubik, sans-serif';
    g.textAlign = 'center';
    g.fillText('0', 128, 225);
    g.fillText('230', 388, 225);
    g.font = '700 46px Heebo, sans-serif';
    g.direction = 'rtl';
    g.fillText('מתח (V)', 256, 380);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame(({ clock }) => {
    if (!needle.current) return;
    const p = power.current;
    const jitter = p < 0.5 ? Math.sin(clock.elapsedTime * 17) * 0.02 : Math.sin(clock.elapsedTime * 9) * 0.006;
    needle.current.rotation.z = lerp(1.03, -0.7, p) + jitter;
  });
  return (
    <group position={[0.35, 1.72, -HALF]}>
      <Interactable label="מד מתח" standpoint="cabinet" onActivate={() => say('companion', solved ? LINES.voltOn : LINES.voltOff)}>
        <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.08, 40]} />
          <meshStandardMaterial color="#2f363c" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.081]}>
          <circleGeometry args={[0.21, 48]} />
          <meshStandardMaterial map={dial} roughness={0.6} />
        </mesh>
        <group ref={needle} position={[0, -0.025, 0.088]}>
          <mesh position={[0, 0.075, 0]} userData={{ noHighlight: true }}>
            <boxGeometry args={[0.008, 0.15, 0.004]} />
            <meshStandardMaterial color="#b5413f" />
          </mesh>
        </group>
      </Interactable>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* West wall – workbench with the signal generator                     */
/* ------------------------------------------------------------------ */

function Workbench() {
  const tex = useMemo(
    () => ({
      top: wood([1, 2]),
      leg: metal('#3a434b', 31),
      peg: pegboard([2.2, 1]),
      poster: sign({
        w: 512,
        h: 680,
        bg: '#d8d0bc',
        pad: 36,
        lines: [
          { text: 'כללי משמרת', size: 54, color: '#1b2430', font: 'Rubik' },
          { text: '1. לפני כל תיקון: לנתק מתח', size: 30, color: '#1b2430', weight: 500, gap: 14 },
          { text: '2. לא נוגעים בכבל חשוף', size: 30, color: '#1b2430', weight: 500 },
          { text: '3. כל תקלה: ליומן', size: 30, color: '#1b2430', weight: 500 },
          { text: '4. הקפה במטבחון בלבד', size: 30, color: '#1b2430', weight: 500 },
          { text: '(מישהו מחק את 4)', size: 26, color: '#7a3b22', weight: 400, gap: 22 },
        ],
      }),
    }),
    [],
  );
  return (
    <group position={[-4.08, 0, 0.45]}>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.8, 0.06, 2.3]} /><meshStandardMaterial map={tex.top} roughness={0.75} /></mesh>
      {[[-0.34, -1.08], [0.34, -1.08], [-0.34, 1.08], [0.34, 1.08]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.44, z]}><boxGeometry args={[0.05, 0.88, 0.05]} /><meshStandardMaterial map={tex.leg} metalness={0.6} roughness={0.5} /></mesh>
      ))}
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.74, 0.03, 2.2]} /><meshStandardMaterial map={tex.top} roughness={0.8} /></mesh>
      {/* pegboard with tools */}
      <mesh position={[-0.395, 1.65, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.2, 1.0]} /><meshStandardMaterial map={tex.peg} roughness={0.9} /></mesh>
      <mesh position={[-0.37, 1.7, -0.7]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.03, 0.32, 0.05]} /><meshStandardMaterial color="#8d2f22" roughness={0.6} /></mesh>
      <mesh position={[-0.37, 1.62, -0.45]}><boxGeometry args={[0.03, 0.26, 0.04]} /><meshStandardMaterial color="#c9a23a" roughness={0.6} /></mesh>
      <mesh position={[-0.36, 1.75, 0.6]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.16, 0.025, 8, 24]} /><meshStandardMaterial color="#2b2b2b" roughness={0.7} /></mesh>
      <mesh position={[-0.37, 1.6, 0.2]}><boxGeometry args={[0.03, 0.22, 0.12]} /><meshStandardMaterial color="#5e666d" metalness={0.7} roughness={0.4} /></mesh>
      {/* poster beside the bench */}
      <mesh position={[-0.405, 1.7, -1.75]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.6, 0.8]} /><meshStandardMaterial map={tex.poster} roughness={0.9} /></mesh>
      {/* mug + toolbox */}
      <mesh position={[0.1, 0.98, -0.78]}><cylinderGeometry args={[0.045, 0.04, 0.1, 18]} /><meshStandardMaterial color="#d9d3c4" roughness={0.4} /></mesh>
      <mesh position={[0.15, 0.98, -0.78]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.028, 0.008, 6, 14, Math.PI]} /><meshStandardMaterial color="#d9d3c4" roughness={0.4} /></mesh>
      <mesh position={[0.02, 1.0, 0.85]}><boxGeometry args={[0.32, 0.16, 0.48]} /><meshStandardMaterial color="#7a3b22" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0.02, 1.1, 0.85]}><boxGeometry args={[0.04, 0.04, 0.3]} /><meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} /></mesh>
      <SignalGenerator />
    </group>
  );
}

function SignalGenerator() {
  const scope = useMemo(() => new Scope(), []);
  const button = useRef();
  const [playing, setPlaying] = useState(false);
  const say = useUI((s) => s.say);
  const tex = useMemo(
    () => ({
      body: metal('#2c3640', 41),
      grille: grille(),
      label: sign({
        w: 512,
        h: 96,
        bg: '#1a2028',
        pad: 22,
        lines: [{ text: 'מחולל אותות · SG-1', size: 40, color: '#DDE8EF' }],
      }),
    }),
    [],
  );
  useFrame(({ clock }) => {
    if (scope.playing) {
      scope.update(getCtx().currentTime);
      if (!scope.playing) setPlaying(false);
    }
    if (button.current) {
      button.current.emissiveIntensity = playing ? 2.2 : 0.9 + Math.sin(clock.elapsedTime * 3) * 0.5;
    }
  });
  const play = () => {
    if (scope.playing) return;
    const run = playBeeps(CODE);
    scope.start(run);
    setPlaying(true);
    sfx.click();
  };
  const activate = () => {
    play();
    const g = useGame.getState();
    if (!roomFlag(g, 1, 'played')) {
      g.setRoomFlag(1, 'played');
      setTimeout(() => say('companion', LINES.firstPlay), 6000);
      maybeReady();
    }
  };
  return (
    <group position={[-0.05, 0.93, -0.15]}>
      <Interactable label={playing ? 'מחולל אותות: משדר…' : 'מחולל אותות: השמעת האות'} standpoint="bench" onActivate={activate}>
        <mesh position={[0, 0.18, 0]}><boxGeometry args={[0.46, 0.36, 0.74]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.45} /></mesh>
        {/* front panel faces +x (into the room) */}
        <mesh position={[0.231, 0.235, -0.11]} rotation={[0, Math.PI / 2, 0]} userData={{ noHighlight: true }}>
          <planeGeometry args={[0.4, 0.225]} />
          <meshBasicMaterial map={scope.texture} toneMapped={false} />
        </mesh>
        <mesh position={[0.231, 0.07, -0.12]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.36, 0.068]} />
          <meshStandardMaterial map={tex.label} roughness={0.6} />
        </mesh>
        <mesh position={[0.231, 0.25, 0.22]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.085, 32]} />
          <meshStandardMaterial map={tex.grille} roughness={0.8} />
        </mesh>
        <mesh position={[0.24, 0.1, 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 28]} />
          <meshStandardMaterial color="#15191d" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.255, 0.1, 0.22]} rotation={[0, 0, Math.PI / 2]} userData={{ noHighlight: true }}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 28]} />
          <meshStandardMaterial ref={button} color="#7a4b12" emissive="#FFB547" emissiveIntensity={1} toneMapped={false} />
        </mesh>
        <mesh position={[0.24, 0.1, 0.11]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.03, 18]} />
          <meshStandardMaterial color="#9aa3aa" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[-0.1, 0.48, 0.28]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 6]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
        </mesh>
      </Interactable>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* South wall – staff locker with the shift briefing                   */
/* ------------------------------------------------------------------ */

function Locker() {
  const [open, setOpen] = useState(false);
  const door = useRef();
  const openOverlay = useUI((s) => s.openOverlay);
  const tex = useMemo(
    () => ({
      body: metal('#56656f', 51),
      inner: metal('#2a3238', 52),
      vents: (() => {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 512;
        const g = c.getContext('2d');
        g.drawImage(metal('#56656f', 51).image, 0, 0, 256, 512);
        g.fillStyle = 'rgba(10,12,14,0.8)';
        for (let i = 0; i < 6; i++) g.fillRect(70, 40 + i * 18, 116, 8);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })(),
      tag: sign({ w: 512, h: 128, bg: '#e6e0d0', pad: 26, align: 'center', lines: [{ text: 'ארונית צוות · משמרת לילה', size: 44, color: '#1b2430' }] }),
      card: sign({
        w: 512,
        h: 340,
        bg: '#f1ece0',
        border: '#c9bfa6',
        pad: 26,
        lines: [
          { text: 'תדריך משמרת', size: 50, color: '#1b2430', font: 'Rubik' },
          { text: '_ _ _ _ _ _ _ _', size: 26, color: '#8a8070' },
          { text: '~~~~~~~~~~~~~~', size: 26, color: '#8a8070' },
          { text: '~~~~~~~~~~', size: 26, color: '#8a8070' },
        ],
      }),
    }),
    [],
  );
  useFrame((_, dt) => {
    if (!door.current) return;
    const target = open ? -1.85 : 0;
    door.current.rotation.y += (target - door.current.rotation.y) * (1 - Math.exp(-dt * 4));
  });
  return (
    <group position={[2, 0, HALF]}>
      <Interactable
        label={open ? 'ארונית צוות' : 'ארונית צוות: פתיחה'}
        standpoint="locker"
        onActivate={() => {
          setOpen((o) => !o);
          sfx.creak();
        }}
      >
        <mesh position={[0, 0.96, -0.02]}><boxGeometry args={[1.0, 1.92, 0.04]} /><meshStandardMaterial map={tex.inner} metalness={0.5} roughness={0.6} /></mesh>
        <mesh position={[-0.49, 0.96, -0.26]}><boxGeometry args={[0.03, 1.92, 0.5]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0.49, 0.96, -0.26]}><boxGeometry args={[0.03, 1.92, 0.5]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 1.92, -0.26]}><boxGeometry args={[1.0, 0.03, 0.52]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 0.02, -0.26]}><boxGeometry args={[1.0, 0.04, 0.52]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 1.45, -0.26]}><boxGeometry args={[0.96, 0.02, 0.48]} /><meshStandardMaterial map={tex.inner} metalness={0.5} roughness={0.6} /></mesh>
        {/* hard hat on the shelf */}
        <group position={[-0.2, 1.46, -0.25]}>
          <mesh><sphereGeometry args={[0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d99a3a" roughness={0.45} /></mesh>
          <mesh position={[0, 0.005, 0]}><cylinderGeometry args={[0.16, 0.16, 0.012, 24]} /><meshStandardMaterial color="#d99a3a" roughness={0.45} /></mesh>
        </group>
        {/* a jacket */}
        <mesh position={[0.28, 0.85, -0.2]}><boxGeometry args={[0.3, 0.7, 0.12]} /><meshStandardMaterial color="#2c3a2a" roughness={0.95} /></mesh>
        <pointLight position={[0, 1.3, -0.35]} intensity={open ? 0.8 : 0} distance={1.4} decay={2} color="#ffe2b8" />
        {/* door, hinged on its +x edge, opening into the room */}
        <group ref={door} position={[0.5, 0.96, -0.51]}>
          <mesh position={[-0.495, 0, 0]}><boxGeometry args={[0.99, 1.9, 0.025]} /><meshStandardMaterial map={tex.vents} metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[-0.495, 0.55, -0.014]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.5, 0.125]} /><meshStandardMaterial map={tex.tag} roughness={0.8} /></mesh>
          <mesh position={[-0.9, -0.05, -0.03]}><boxGeometry args={[0.03, 0.2, 0.03]} /><meshStandardMaterial color="#20252a" metalness={0.8} roughness={0.3} /></mesh>
        </group>
        {/* the briefing card taped inside, readable once the locker is open */}
        <Interactable label="תדריך משמרת: קריאה" enabled={open} onActivate={() => openOverlay('note')}>
          <mesh position={[-0.12, 1.12, -0.045]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.44, 0.29]} />
            <meshStandardMaterial map={tex.card} roughness={0.85} />
          </mesh>
        </Interactable>
      </Interactable>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* East wall – exit door, status lamp, code keypad, elevator behind     */
/* ------------------------------------------------------------------ */

function ExitDoor({ power, solved }) {
  const slab = useRef();
  const lamp = useRef();
  const lampLight = useRef();
  const say = useUI((s) => s.say);
  const opened = useRef(false);
  const tex = useMemo(
    () => ({
      slab: (() => {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 1024;
        const g = c.getContext('2d');
        g.drawImage(metal('#3e4a54', 61).image, 0, 0, 512, 1024);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let y = 120; y < 1000; y += 220) g.fillRect(30, y, 452, 6);
        g.fillStyle = 'rgba(221,232,239,0.75)';
        g.font = '700 300px Rubik, sans-serif';
        g.textAlign = 'center';
        g.fillText('2', 256, 560);
        g.font = '700 54px Heebo, sans-serif';
        g.direction = 'rtl';
        g.fillText('אל שכבה 2', 256, 680);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })(),
      frame: metal('#2a3138', 62),
      haz: hazard([3, 1]),
      exitSign: sign({ w: 512, h: 128, bg: '#13202b', border: '#3FD0E0', pad: 26, align: 'center', lines: [{ text: 'יציאה · אולם הליבה', size: 38, color: '#DDE8EF' }] }),
      elevator: metal('#26313b', 63),
    }),
    [],
  );
  const red = useMemo(() => new THREE.Color('#EF6D73'), []);
  const green = useMemo(() => new THREE.Color('#65CDAA'), []);

  useFrame((_, dt) => {
    const p = power.current;
    const open = p > 0.75;
    if (open && !opened.current) {
      opened.current = true;
      sfx.door();
    }
    if (slab.current) {
      const target = open ? 0.9 : -0.5;
      slab.current.position.z += (target - slab.current.position.z) * (1 - Math.exp(-dt * 1.6));
    }
    const c = p > 0.5 ? green : red;
    if (lamp.current) lamp.current.emissive.copy(c);
    if (lampLight.current) lampLight.current.color.copy(c);
  });

  const activate = () => {
    if (!solved) {
      sfx.buzz();
      say('companion', LINES.locked);
      return;
    }
    leaveRoom(1);
  };

  return (
    <group>
      <Interactable label={solved ? 'חזרה לאולם הליבה' : 'דלת היציאה: נעולה'} standpoint="door" onActivate={activate}>
        {/* frame */}
        <mesh position={[4.44, 1.15, -1.21]}><boxGeometry args={[0.14, 2.3, 0.12]} /><meshStandardMaterial map={tex.frame} metalness={0.7} roughness={0.4} /></mesh>
        <mesh position={[4.44, 1.15, 0.21]}><boxGeometry args={[0.14, 2.3, 0.12]} /><meshStandardMaterial map={tex.frame} metalness={0.7} roughness={0.4} /></mesh>
        <mesh position={[4.44, 2.36, -0.5]}><boxGeometry args={[0.14, 0.14, 1.54]} /><meshStandardMaterial map={tex.frame} metalness={0.7} roughness={0.4} /></mesh>
        <mesh position={[4.37, 2.36, -0.5]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.54, 0.12]} /><meshStandardMaterial map={tex.haz} roughness={0.7} /></mesh>
        {/* top rail for the sliding door */}
        <mesh position={[4.4, 2.5, 0.2]}><boxGeometry args={[0.08, 0.08, 2.9]} /><meshStandardMaterial color="#20262c" metalness={0.8} roughness={0.35} /></mesh>
        {/* sliding slab */}
        <group ref={slab} position={[4.4, 1.14, -0.5]}>
          <mesh><boxGeometry args={[0.07, 2.26, 1.32]} /><meshStandardMaterial map={tex.slab} metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[-0.05, 0, 0.5]}><boxGeometry args={[0.04, 0.5, 0.05]} /><meshStandardMaterial color="#15191d" metalness={0.8} roughness={0.3} /></mesh>
        </group>
        {/* status lamp + sign */}
        <mesh position={[4.38, 2.58, -0.5]} userData={{ noHighlight: true }}>
          <sphereGeometry args={[0.06, 16, 12]} />
          <meshStandardMaterial ref={lamp} color="#222" emissive="#EF6D73" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh position={[4.47, 2.85, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.3, 0.32]} />
          <meshStandardMaterial map={tex.exitSign} roughness={0.7} />
        </mesh>
      </Interactable>
      <pointLight ref={lampLight} position={[4.1, 2.55, -0.5]} intensity={1.5} distance={3} decay={2} color="#EF6D73" />
      {/* elevator car behind the door */}
      <mesh position={[5.35, 1.3, -0.5]}>
        <boxGeometry args={[1.7, 2.6, 1.7]} />
        <meshStandardMaterial map={tex.elevator} metalness={0.6} roughness={0.5} side={THREE.BackSide} />
      </mesh>
      {[-1.25, 0.25].map((z) => (
        <mesh key={z} position={[6.15, 1.3, z]}>
          <boxGeometry args={[0.04, 2.1, 0.05]} />
          <meshStandardMaterial color="#0d2a30" emissive="#3FD0E0" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[5.5, 2.2, -0.5]} intensity={solved ? 4 : 0.4} distance={4} decay={2} color="#3FD0E0" />
    </group>
  );
}

function Keypad({ solved }) {
  const openOverlay = useUI((s) => s.openOverlay);
  const say = useUI((s) => s.say);
  const tex = useMemo(
    () => ({
      body: metal('#2a333c', 71),
      screenOff: sign({ w: 512, h: 160, bg: '#0b1410', pad: 30, align: 'center', aged: false, lines: [{ text: 'הזינו קוד · 8 ספרות', size: 52, color: '#FFB547' }] }),
      screenOn: sign({ w: 512, h: 160, bg: '#0b1410', pad: 30, align: 'center', aged: false, lines: [{ text: 'קוד התקבל · מתח פעיל', size: 52, color: '#65CDAA' }] }),
      keys: (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#1b2229';
        g.fillRect(0, 0, 512, 512);
        const keys = [['1', 'מחק'], ['0', 'אישור']];
        keys.forEach((row, r) =>
          row.forEach((k, i) => {
            const x = 40 + i * 236, y = 40 + r * 236;
            g.fillStyle = '#3a4550';
            g.fillRect(x, y, 196, 196);
            g.fillStyle = '#DDE8EF';
            g.font = k.length > 1 ? '700 52px Heebo, sans-serif' : '700 110px Rubik, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.direction = 'rtl';
            g.fillText(k, x + 98, y + 104);
          }),
        );
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })(),
    }),
    [],
  );
  return (
    <group position={[4.47, 1.38, -1.62]} rotation={[0, -Math.PI / 2, 0]}>
      <Interactable
        label={solved ? 'לוח קוד הדלת' : 'לוח קוד הדלת: הקלדה'}
        standpoint="door"
        onActivate={() => (solved ? say('companion', 'הקוד כבר התקבל.') : openOverlay('keypad'))}
      >
        <mesh><boxGeometry args={[0.3, 0.42, 0.05]} /><meshStandardMaterial map={tex.body} metalness={0.6} roughness={0.45} /></mesh>
        <mesh position={[0, 0.13, 0.026]} userData={{ noHighlight: true }}>
          <planeGeometry args={[0.24, 0.075]} />
          <meshBasicMaterial map={solved ? tex.screenOn : tex.screenOff} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.06, 0.026]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshStandardMaterial map={tex.keys} roughness={0.6} />
        </mesh>
      </Interactable>
      {/* conduit from keypad up to the tray */}
      <mesh position={[0.1, 1.15, -0.02]}><cylinderGeometry args={[0.018, 0.018, 1.9, 8]} /><meshStandardMaterial color="#59626a" metalness={0.7} roughness={0.4} /></mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Clutter: cables, spool, ladder, fuse box, hazard floor marking      */
/* ------------------------------------------------------------------ */

function Clutter() {
  const tex = useMemo(
    () => ({
      haz: hazard([5, 1]),
      spool: wood([1, 1]),
      fuse: metal('#58646e', 81),
      fuseTag: sign({ w: 256, h: 96, bg: '#e6e0d0', pad: 18, align: 'center', lines: [{ text: 'ת״ח 2', size: 48, color: '#1b2430' }] }),
      extTag: sign({ w: 256, h: 128, bg: '#7d2222', pad: 22, align: 'center', lines: [{ text: 'מטף', size: 64, color: '#f1ece0' }] }),
    }),
    [],
  );
  const cables = useMemo(() => {
    const mk = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 64, r, 8, false);
    return [
      mk([[-1.9, 0.14, -4.05], [-2.4, 0.03, -3.4], [-3.2, 0.03, -2.2], [-3.75, 0.03, -0.9], [-3.9, 0.6, -0.1], [-4.05, 0.93, -0.4]], 0.025),
      mk([[-1.2, 0.14, -4.05], [-0.6, 0.03, -3.2], [0.8, 0.03, -3.6], [2.4, 0.03, -3.9], [3.6, 0.03, -2.0], [4.3, 0.2, -1.4]], 0.02),
      mk([[-3.6, 0.03, 3.0], [-2.8, 0.03, 3.8], [-1.6, 0.03, 3.5], [-0.8, 0.03, 4.1]], 0.03),
    ];
  }, []);
  return (
    <group>
      <mesh position={[-1.5, 0.004, -3.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 0.18]} />
        <meshStandardMaterial map={tex.haz} roughness={0.8} />
      </mesh>
      {cables.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={['#151515', '#2a2016', '#5a2a1c'][i]} roughness={0.65} />
        </mesh>
      ))}
      {/* cable spool */}
      <group position={[-3.55, 0.42, 3.3]} rotation={[0, 0.5, Math.PI / 2]}>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.42, 0.42, 0.04, 28]} /><meshStandardMaterial map={tex.spool} roughness={0.8} /></mesh>
        <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.42, 0.42, 0.04, 28]} /><meshStandardMaterial map={tex.spool} roughness={0.8} /></mesh>
        <mesh><cylinderGeometry args={[0.3, 0.3, 0.46, 28]} /><meshStandardMaterial color="#1c1c1c" roughness={0.6} /></mesh>
      </group>
      {/* ladder leaning on the south wall */}
      <group position={[-1.9, 0, 4.15]} rotation={[0.2, 0, 0]}>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, 1.35, 0]}><boxGeometry args={[0.05, 2.7, 0.06]} /><meshStandardMaterial color="#9aa3aa" metalness={0.8} roughness={0.35} /></mesh>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[0, 0.3 + i * 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.44, 8]} />
            <meshStandardMaterial color="#9aa3aa" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
      </group>
      {/* secondary fuse box */}
      <group position={[1.4, 1.45, -4.41]}>
        <mesh><boxGeometry args={[0.5, 0.62, 0.18]} /><meshStandardMaterial map={tex.fuse} metalness={0.6} roughness={0.5} /></mesh>
        <mesh position={[0, 0.18, 0.091]}><planeGeometry args={[0.26, 0.1]} /><meshStandardMaterial map={tex.fuseTag} roughness={0.8} /></mesh>
        <mesh position={[0, 1.4, -0.05]}><cylinderGeometry args={[0.03, 0.03, 2.2, 10]} /><meshStandardMaterial color="#6d757c" metalness={0.7} roughness={0.4} /></mesh>
      </group>
      {/* fire extinguisher */}
      <group position={[4.3, 0, 3.4]}>
        <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.09, 0.09, 0.6, 20]} /><meshStandardMaterial color="#8e2b27" metalness={0.3} roughness={0.4} /></mesh>
        <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.03, 0.05, 0.1, 12]} /><meshStandardMaterial color="#222" /></mesh>
        <mesh position={[0.18, 1.2, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.3, 0.15]} /><meshStandardMaterial map={tex.extTag} roughness={0.8} /></mesh>
      </group>
      {/* stool next to the electrician */}
      <group position={[3.5, 0, -2.3]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 20]} /><meshStandardMaterial color="#3a2a1e" roughness={0.7} /></mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.13, 0.3, Math.sin((i * Math.PI * 2) / 3) * 0.13]}>
            <cylinderGeometry args={[0.015, 0.015, 0.6, 6]} />
            <meshStandardMaterial color="#555" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* floor drain */}
      <mesh position={[0.6, 0.003, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 24]} />
        <meshStandardMaterial color="#1a1c1e" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}


/* ------------------------------------------------------------------ */
/* Extra electrical infrastructure on the north-east wall              */
/* Junction boxes with status LEDs (red blink while the power is out,  */
/* steady green once restored), a high-voltage sign, a floor trench    */
/* and an amber status strip that wakes up with the power.             */
/* ------------------------------------------------------------------ */

const RED = new THREE.Color('#ff4a3d');
const GREEN = new THREE.Color('#5dffb0');

function Room1Extras({ power }) {
  const leds = useRef([]);
  const strip = useRef();
  const tex = useMemo(
    () => ({
      box: metal('#4d5862', 83),
      danger: sign({ w: 320, h: 220, bg: '#f2c230', pad: 20, align: 'center', lines: [{ text: '⚡', size: 70, color: '#151515' }, { text: 'סכנה: מתח גבוה', size: 38, color: '#151515', gap: 6 }] }),
      tag: (n) => sign({ w: 192, h: 72, bg: '#d9d4c6', pad: 12, align: 'center', lines: [{ text: `JB-0${n}`, size: 40, color: '#1b2430', font: 'monospace' }] }),
      haz: hazard([1, 1]),
    }),
    [],
  );
  const tags = useMemo(() => [1, 2, 3].map((n) => tex.tag(n)), [tex]);
  useFrame(({ clock }) => {
    const p = power.current;
    const t = clock.elapsedTime;
    leds.current.forEach((m, i) => {
      if (!m) return;
      if (p > 0.5) {
        m.emissive.copy(GREEN);
        m.emissiveIntensity = 2.2;
      } else {
        m.emissive.copy(RED);
        m.emissiveIntensity = Math.sin(t * 2.2 + i * 1.7) > 0.3 ? 2.4 : 0.15;
      }
    });
    if (strip.current) strip.current.emissiveIntensity = 0.12 + p * 1.6;
  });
  return (
    <group>
      {/* three junction boxes with conduits up to the cable tray */}
      {[2.55, 3.15, 3.75].map((x, i) => (
        <group key={x} position={[x, 1.55 + (i % 2) * 0.18, -HALF + 0.11]}>
          <mesh><boxGeometry args={[0.46, 0.56, 0.2]} /><meshStandardMaterial map={tex.box} metalness={0.65} roughness={0.42} /></mesh>
          <mesh position={[0, 0, 0.101]}><planeGeometry args={[0.38, 0.48]} /><meshStandardMaterial color="#3d4750" metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[0, 0.17, 0.104]}><planeGeometry args={[0.2, 0.075]} /><meshStandardMaterial map={tags[i]} roughness={0.8} /></mesh>
          <mesh position={[0.13, -0.17, 0.11]} userData={{ noHighlight: true }}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshStandardMaterial ref={(el) => (leds.current[i] = el)} color="#111" emissive="#ff4a3d" emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.0 + (i % 2 ? -0.09 : 0), -0.02]}>
            <cylinderGeometry args={[0.028, 0.028, 1.45 - (i % 2) * 0.18, 10]} />
            <meshStandardMaterial color="#6d757c" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* high-voltage warning sign */}
      <mesh position={[3.15, 2.62, -HALF + 0.02]}>
        <planeGeometry args={[0.62, 0.43]} />
        <meshStandardMaterial map={tex.danger} roughness={0.7} />
      </mesh>
      {/* amber status strip along the top of the north wall, wakes up with the power */}
      <mesh position={[1.4, 3.32, -HALF + 0.03]} userData={{ noHighlight: true }}>
        <boxGeometry args={[5.6, 0.03, 0.02]} />
        <meshStandardMaterial ref={strip} color="#000" emissive="#e9a45d" emissiveIntensity={0.12} toneMapped={false} />
      </mesh>
      {/* floor cable trench with a steel cover and hazard ends */}
      <mesh position={[2.0, 0.006, -3.95]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 0.3]} />
        <meshStandardMaterial color="#3a4148" metalness={0.75} roughness={0.35} />
      </mesh>
      {[-0.15, 4.15].map((x) => (
        <mesh key={x} position={[x, 0.008, -3.95]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshStandardMaterial map={tex.haz} roughness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[0.0 + i * 0.4, 0.012, -3.95]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 0.26]} />
          <meshStandardMaterial color="#1b1f23" roughness={0.8} />
        </mesh>
      ))}
      <Dust w={8.2} d={8.2} h={H} color="#ffd9a8" size={2.2} count={300} opacity={0.45} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function Room1Scene() {
  const solved = useGame((s) => s.solved.includes(1));
  const say = useUI((s) => s.say);
  const replay = useUI((s) => s.replayBubble);
  const power = useRef(solved ? 1 : 0);
  const wasSolved = useRef(solved);

  useFrame((_, dt) => {
    const target = solved ? 1 : 0;
    power.current += (target - power.current) * Math.min(1, dt * 0.8);
  });

  useEffect(() => {
    if (solved && !wasSolved.current) {
      wasSolved.current = true;
      sfx.powerUp();
      setTimeout(() => say('companion', LINES.solved), 1800);
    }
  }, [solved, say]);

  return (
    <>
      <color attach="background" args={['#06080b']} />
      <fog attach="fog" args={['#0a0e13', 7, 18]} />
      <ambientLight intensity={0.75} color="#a8b6c4" />
      <hemisphereLight args={['#c4ccd4', '#2a2018', 0.8]} />
      <Shell />
      <Services />
      <Lamps power={power} />
      <KeyLight position={[1.8, 3.1, -1.0]} target={[0.6, 0, -2.6]} ceiling={3.6} color="#ffd3a0" intensity={7} angle={1.2} fixture={false} shaft={false} />
      <MainCabinet power={power} solved={solved} />
      <Voltmeter power={power} solved={solved} />
      <Workbench />
      <Locker />
      <ExitDoor power={power} solved={solved} />
      <Keypad solved={solved} />
      <Clutter />
      <Room1Extras power={power} />
      <Companion position={[1.5, 0, -2.0]} facing={-0.35} onActivate={replay} />
    </>
  );
}
