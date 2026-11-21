// Room 5 – Session: the old switchboard. Put the conversation back in order.
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame, useUI, findClue, leaveRoom } from '../../game/store';
import { roomByNumber } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Sign, RoomShell, ExitDoor, RoomLights, Pl } from '../../engine/kit';
import { wood, sign } from '../../engine/textures';
import { Companion } from '../../companion/Companion';
import { Device, Feedback } from '../../ui/Device';
import { sfx } from '../../audio/audio';
import * as THREE from 'three';

const R = roomByNumber(5);
const D = 7;

export const standpoints = {
  center: { label: 'מרכז החדר', pos: [0, 1.6, 2.0], look: [0, 1.5, -3.5] },
  board: { label: 'לוח החיבורים', pos: [0, 1.6, -0.6], look: [0, 1.6, -3.5] },
  desk: { label: 'עמדת המרכזנית', pos: [1.0, 1.5, 0.9], look: [2.8, 0.9, 0.9] },
};

// The correct order.
const LINES = [
  { id: 'open', who: 'המחשב של נועה', text: 'מבקש לפתוח סשן העלאה לשרת המכללה.' },
  { id: 'ack', who: 'השרת', text: 'הסשן פתוח. מספר סשן: 4471.' },
  { id: 'p1', who: 'המחשב של נועה', text: 'חלק 1 מתוך 3 נשלח. נשמרה נקודת ביקורת.' },
  { id: 'cut', who: 'המרכזייה', text: '⚡ הקו נפל באמצע חלק 2.' },
  { id: 'resume', who: 'המחשב של נועה', text: 'חוזר לסשן 4471, ממשיך מנקודת הביקורת, מחלק 2.' },
  { id: 'close', who: 'השרת', text: 'חלקים 2 ו-3 התקבלו. סוגרים את הסשן.' },
];
const SHUFFLED = ['resume', 'close', 'open', 'cut', 'p1', 'ack'];

function Switchboard({ solved }) {
  const lamps = useRef([]);
  const panel = useMemo(() => wood([1, 1]), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lamps.current.forEach((m, i) => {
      if (!m) return;
      m.emissiveIntensity = solved ? (Math.sin(t * 2 - i * 0.3) > 0 ? 2.2 : 0.8) : Math.sin(t * 5 + i * 7.1) > 0.7 ? 1.6 : 0.15;
    });
  });
  const cords = useMemo(() => {
    const mk = (a, b, sag) => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), new THREE.Vector3((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - sag, a[2] + 0.18), new THREE.Vector3(...b)), 24, 0.012, 6, false);
    return [mk([-1.2, 1.9, 0.08], [0.4, 1.3, 0.08], 0.5), mk([-0.4, 2.2, 0.08], [1.0, 1.6, 0.08], 0.6), mk([0.8, 1.15, 0.08], [-0.8, 1.45, 0.08], 0.4)];
  }, []);
  return (
    <group position={[0, 0, -3.3]}>
      {/* warm backlight halo, makes the board the focal point of the room */}
      <Box p={[0, 1.6, -0.1]} s={[3.62, 2.42, 0.02]} c="#000" e="#ffb27a" ei={solved ? 1.6 : 1.05} noHighlight />
      <Box p={[0, 1.6, 0]} s={[3.4, 2.2, 0.18]} map={panel} r={0.6} />
      {/* brass frame */}
      {[[0, 2.72, 3.5, 0.05], [0, 0.48, 3.5, 0.05]].map(([x, y, w, h]) => (
        <Box key={y} p={[x, y, 0.1]} s={[w, h, 0.04]} c="#b58a5a" m={0.85} r={0.3} />
      ))}
      {[-1.73, 1.73].map((x) => (
        <Box key={x} p={[x, 1.6, 0.1]} s={[0.05, 2.29, 0.04]} c="#b58a5a" m={0.85} r={0.3} />
      ))}
      <pointLight position={[0, 2.0, 1.1]} intensity={3.2} distance={3.4} decay={1.6} color="#ffd1a3" />
      <Box p={[0, 0.5, 0.25]} s={[3.4, 0.08, 0.6]} map={panel} r={0.6} />
      <Box p={[0, 0.25, 0.25]} s={[3.3, 0.5, 0.5]} c="#3b2c24" r={0.7} />
      {Array.from({ length: 60 }, (_, i) => {
        const x = -1.45 + (i % 12) * 0.265, y = 1.0 + Math.floor(i / 12) * 0.28;
        return (
          <group key={i} position={[x, y, 0.095]}>
            <Cyl a={[0.025, 0.025, 0.02, 12]} rot={[Math.PI / 2, 0, 0]} c="#b58a5a" m={0.85} r={0.3} />
            <mesh position={[0, 0.07, 0.01]} userData={{ noHighlight: true }}>
              <sphereGeometry args={[0.014, 8, 6]} />
              <meshStandardMaterial ref={(el) => (lamps.current[i] = el)} color="#221" emissive="#ffcf8a" emissiveIntensity={0.3} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {cords.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={['#7a2b2b', '#2b2b2b', '#6b5a2a'][i]} roughness={0.6} />
        </mesh>
      ))}
      <Sign p={[0, 2.82, 0.1]} s={[1.6, 0.22]} w={800} h={110} bg="#3b2c24" pad={18} align="center" lines={[{ text: 'מרכזייה · קו 5', size: 56, color: '#f1e3cc', font: 'Rubik' }]} />
    </group>
  );
}

export function Scene() {
  const solved = useGame((s) => s.solved.includes(5));
  const open = useUI((s) => s.openOverlay);
  const say = useUI((s) => s.say);
  const replay = useUI((s) => s.replayBubble);
  const desk = useMemo(() => wood([1, 1]), []);
  const book = useMemo(() => sign({ w: 512, h: 360, bg: '#efe6d2', pad: 26, lines: [{ text: 'יומן המרכזייה', size: 52, color: '#3b2c24', font: 'Rubik' }, { text: 'פתיחה ← ביקורת ← חידוש ← סגירה', size: 34, color: '#3b2c24', gap: 16 }, { text: '~~~~~~~~~~~~', size: 30, color: '#9b8a70' }] }), []);
  return (
    <>
      <color attach="background" args={['#0f0b0a']} />
      <fog attach="fog" args={['#0f0b0a', 8, 18]} />
      <RoomLights fill="#f0dcc6" ground="#2a1c18" amount={0.55} solved={solved} />
      <RoomShell w={7} d={D} h={3.5} wall="#5a4a44" floor="#2c2422" ceil="#231c1a" pilaster="#8a6a52" cove="#ffd9ae" coveIntensity={0.95} panelCols={2} panelRows={2} seed={51} />
      {/* warm pendant lamps */}
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0, -1.2]}>
          <Cyl p={[0, 3.2, 0]} a={[0.006, 0.006, 0.6, 6]} c="#111" />
          <Cyl p={[0, 2.85, 0]} a={[0.08, 0.3, 0.22, 24, 1, true]} c="#6b4a2f" m={0.7} r={0.4} side={THREE.DoubleSide} />
          <mesh position={[0, 2.78, 0]} userData={{ noHighlight: true }}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshStandardMaterial color="#ffe0b0" emissive="#ffc27a" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 2.6, 0]} color="#ffc98a" intensity={7} distance={7} decay={1.5} />
        </group>
      ))}
      <Interactable label="לוח החיבורים: לשחזר את הסשן" standpoint="board" onActivate={() => (solved ? say('companion', 'הסשן כבר שוחזר.') : open('order'))}>
        <Switchboard solved={solved} />
      </Interactable>
      {/* operator desk with the logbook */}
      <group position={[2.8, 0, 0.9]}>
        <Box p={[0, 0.74, 0]} s={[0.8, 0.05, 1.5]} map={desk} r={0.55} />
        <Box p={[0, 0.37, 0.7]} s={[0.7, 0.74, 0.05]} c="#3b2c24" r={0.7} />
        <Box p={[0, 0.37, -0.7]} s={[0.7, 0.74, 0.05]} c="#3b2c24" r={0.7} />
        {/* old phone */}
        <Box p={[0.05, 0.82, -0.45]} s={[0.22, 0.1, 0.2]} c="#1b1b1b" m={0.4} r={0.3} />
        <Box p={[0.05, 0.9, -0.45]} s={[0.06, 0.05, 0.26]} c="#1b1b1b" m={0.4} r={0.3} />
        {/* headset */}
        <mesh position={[0.1, 0.84, 0.45]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.09, 0.012, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#2b2b2b" />
        </mesh>
        <Interactable label="יומן המרכזייה: לקרוא" standpoint="desk" onActivate={() => findClue('r5-log', R.lines.log)}>
          <Box p={[-0.05, 0.775, 0.05]} s={[0.36, 0.03, 0.5]} c="#6b2f2a" r={0.7} />
          <Pl p={[-0.05, 0.792, 0.05]} rot={[-Math.PI / 2, 0, Math.PI / 2]} s={[0.46, 0.32]} map={book} r={0.8} />
        </Interactable>
      </group>
      {/* a coat stand and chair for scale */}
      <group position={[-2.8, 0, 2.3]}>
        <Cyl p={[0, 0.9, 0]} a={[0.025, 0.04, 1.8, 10]} c="#4a3426" r={0.6} />
        <Box p={[0, 1.55, 0.1]} s={[0.35, 0.5, 0.1]} c="#5a3a4a" r={0.95} />
      </group>
      <ExitDoor d={D} open={solved} accent="#c08a62" onActivate={() => (solved ? leaveRoom(5) : say('companion', 'הקו עדיין מנותק. קודם משחזרים את הסשן.'))} />
      <Companion position={[-1.6, 0, -0.5]} facing={0.4} onActivate={replay} />
    </>
  );
}

function OrderOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const say = useUI((s) => s.say);
  const [order, setOrder] = useState(SHUFFLED);
  const [msg, setMsg] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [result, setResult] = useState(null);
  const move = (from, to) => {
    if (to < 0 || to >= order.length) return;
    sfx.drop();
    setResult(null);
    setMsg(null);
    setOrder((o) => {
      const n = [...o];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x);
      return n;
    });
  };
  const check = () => {
    const res = order.map((id, i) => id === LINES[i].id);
    setResult(res);
    if (res.every(Boolean)) {
      sfx.success();
      setMsg({ kind: 'ok', text: 'הסשן שוחזר, מהפתיחה, דרך הנפילה והחידוש, ועד הסגירה.' });
      setTimeout(() => {
        close();
        useGame.getState().solveRoom(5);
        setTimeout(() => say('companion', R.lines.solved), 600);
      }, 1300);
    } else {
      sfx.buzz();
      setMsg({ kind: 'error', text: 'לא בדיוק. תבדקו שוב את הסדר.' });
      say('companion', R.lines.wrong);
    }
  };
  return (
    <Device title="לוח החיבורים" subtitle="גררו את המשפטים לסדר הנכון (או השתמשו בחיצים)" wide tone="copper">
      <ol className="order-list">
        {order.map((id, i) => {
          const line = LINES.find((l) => l.id === id);
          return (
            <li
              key={id}
              className={`order-item ${dragId === id ? 'dragging' : ''} ${result ? (result[i] ? 'ok' : 'bad') : ''}`}
              draggable
              onDragStart={(e) => { setDragId(id); e.dataTransfer.setData('text/plain', String(i)); sfx.pick(); }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); move(Number(e.dataTransfer.getData('text/plain')), i); setDragId(null); }}
            >
              <span className="order-num">{i + 1}</span>
              <span className="order-text">
                <small>{line.who}</small>
                {line.text}
              </span>
              <span className="order-moves">
                <button type="button" aria-label="להזיז למעלה" disabled={i === 0} onClick={() => move(i, i - 1)}>▲</button>
                <button type="button" aria-label="להזיז למטה" disabled={i === order.length - 1} onClick={() => move(i, i + 1)}>▼</button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="device-actions">
        <button type="button" className="btn" onClick={check}>בדיקה</button>
        {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
      </div>
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'order' ? <OrderOverlay /> : null;
}
