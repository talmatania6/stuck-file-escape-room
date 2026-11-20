// Room 3 – Network: the routing control centre.
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGame, useUI, findClue, leaveRoom, WRONG_ROUTE_PENALTY_MS } from '../../game/store';
import { roomByNumber } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Sign, RoomShell, ExitDoor, LightPanel, RoomLights, Leds, Pl } from '../../engine/kit';
import { wood } from '../../engine/textures';
import { Companion } from '../../companion/Companion';
import { Device, Feedback } from '../../ui/Device';
import { sfx } from '../../audio/audio';

const R = roomByNumber(3);
const D = 7;

export const standpoints = {
  center: { label: 'מרכז החדר', pos: [0, 1.6, 2.0], look: [0, 1.6, -3.5] },
  desk: { label: 'עמדת הניתוב', pos: [0, 1.55, 0.2], look: [0, 1.2, -1.6] },
  rack: { label: 'ארון הנתבים', pos: [-1.3, 1.6, 0.6], look: [-3.5, 1.5, 0.6] },
  board: { label: 'לוח הסטטוס', pos: [1.3, 1.6, 0.4], look: [3.5, 1.7, 0.4] },
};

/* Network graph shared by the wall map and the routing screen */
const NODES = {
  H: { x: 60, y: 240, label: 'הבית' },
  R1: { x: 190, y: 240 },
  R2: { x: 360, y: 110 },
  R3: { x: 360, y: 250 },
  R5: { x: 300, y: 400 },
  R6: { x: 470, y: 400 },
  R4: { x: 560, y: 240 },
  S: { x: 700, y: 240, label: 'שרת המכללה' },
};
const LINKS = [['H', 'R1'], ['R1', 'R2'], ['R1', 'R3'], ['R1', 'R5'], ['R2', 'R4'], ['R3', 'R4'], ['R5', 'R6'], ['R6', 'R4'], ['R4', 'S']];
const ROUTES = [
  { id: 'A', name: 'מסלול א', path: ['H', 'R1', 'R2', 'R4', 'S'], ok: true },
  { id: 'B', name: 'מסלול ב', path: ['H', 'R1', 'R3', 'R4', 'S'], reason: 'faulty' },
  { id: 'C', name: 'מסלול ג', path: ['H', 'R1', 'R5', 'R6', 'R4', 'S'], reason: 'long' },
];
const routers = (r) => r.path.filter((n) => n.startsWith('R'));

function mapTexture(solved) {
  const c = document.createElement('canvas');
  c.width = 1520;
  c.height = 960;
  const g = c.getContext('2d');
  g.fillStyle = '#0c1813';
  g.fillRect(0, 0, 1520, 960);
  g.strokeStyle = 'rgba(95,174,142,0.12)';
  for (let x = 0; x < 1520; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 960); g.stroke(); }
  for (let y = 0; y < 960; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1520, y); g.stroke(); }
  g.save();
  g.scale(2, 2);
  g.lineCap = 'round';
  LINKS.forEach(([a, b]) => {
    g.strokeStyle = 'rgba(160,190,175,0.45)';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(NODES[a].x, NODES[a].y); g.lineTo(NODES[b].x, NODES[b].y); g.stroke();
  });
  if (solved) {
    g.strokeStyle = '#3FD0E0';
    g.lineWidth = 8;
    g.beginPath();
    ROUTES[0].path.forEach((n, i) => (i ? g.lineTo(NODES[n].x, NODES[n].y) : g.moveTo(NODES[n].x, NODES[n].y)));
    g.stroke();
  }
  Object.entries(NODES).forEach(([id, n]) => {
    const endpoint = !id.startsWith('R');
    g.fillStyle = endpoint ? '#d9e2ea' : id === 'R3' ? '#ef6d73' : '#5fae8e';
    g.beginPath(); g.arc(n.x, n.y, endpoint ? 18 : 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8eef3';
    g.font = '700 22px Rubik, sans-serif';
    g.textAlign = 'center';
    g.direction = 'rtl';
    g.fillText(n.label || id, n.x, n.y - 26);
  });
  g.restore();
  g.fillStyle = '#9fc9b6';
  g.font = '700 40px Heebo, sans-serif';
  g.textAlign = 'right';
  g.direction = 'rtl';
  g.fillText('מפת הרשת · יעד: 82.80.14.7', 1480, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Scene() {
  const solved = useGame((s) => s.solved.includes(3));
  const open = useUI((s) => s.openOverlay);
  const say = useUI((s) => s.say);
  const replay = useUI((s) => s.replayBubble);
  const map = useMemo(() => mapTexture(solved), [solved]);
  const desk = useMemo(() => wood([1, 1]), []);
  return (
    <>
      <color attach="background" args={['#0a100d']} />
      <fog attach="fog" args={['#0a100d', 8, 18]} />
      <RoomLights fill="#d8e6df" ground="#1d2a24" amount={0.6} solved={solved} />
      <RoomShell w={7} d={D} h={3.6} wall="#34463f" floor="#22282a" ceil="#1d2422" pilaster="#5c6a64" cove="#dff5ea" seed={31} />
      <LightPanel p={[0, 3.58, -0.6]} s={[1.6, 0.04, 0.5]} color="#f1fff8" light={10} />
      <LightPanel p={[0, 3.58, 1.8]} s={[1.6, 0.04, 0.5]} color="#f1fff8" light={6} />
      {/* the map wall */}
      <group position={[0, 1.95, -3.44]}>
        <Box s={[4.3, 2.3, 0.08]} c="#141a17" m={0.5} r={0.4} />
        <Pl p={[0, 0, 0.045]} s={[4.0, 2.05]} map={map} basic />
      </group>
      {/* routing desk */}
      <Interactable label="עמדת הניתוב – לבחור מסלול" standpoint="desk" onActivate={() => (solved ? say('companion', 'המסלול כבר נבחר.') : open('route'))}>
        <group position={[0, 0, -1.55]}>
          <Box p={[0, 0.74, 0]} s={[2.2, 0.06, 0.8]} map={desk} r={0.5} />
          <Box p={[-1.0, 0.37, 0]} s={[0.08, 0.74, 0.7]} c="#2a302d" m={0.6} r={0.4} />
          <Box p={[1.0, 0.37, 0]} s={[0.08, 0.74, 0.7]} c="#2a302d" m={0.6} r={0.4} />
          {[-0.5, 0.5].map((x, i) => (
            <group key={x} position={[x, 1.08, -0.18]} rotation={[-0.1, x < 0 ? 0.2 : -0.2, 0]}>
              <Box s={[0.82, 0.5, 0.04]} c="#121615" m={0.5} r={0.4} />
              <Sign p={[0, 0, 0.022]} s={[0.76, 0.44]} lit w={640} h={370} bg="#0c1813" pad={34} align="center" aged={false}
                lines={i === 0 ? [{ text: 'בחירת מסלול', size: 60, color: '#DDE8EF', font: 'Rubik' }, { text: solved ? 'נשלח במסלול א' : 'ממתין לבחירה', size: 44, color: solved ? '#65CDAA' : '#FFB547', gap: 18 }] : [{ text: 'יעד', size: 44, color: '#9fc9b6' }, { text: '82.80.14.7', size: 64, color: '#DDE8EF', dir: 'ltr', align: 'center', font: 'Rubik' }]} />
            </group>
          ))}
          <Box p={[0, 0.78, 0.2]} s={[0.5, 0.02, 0.18]} c="#1a1d1f" m={0.4} r={0.5} />
          {/* a driver's cap left on the desk */}
          <group position={[0.75, 0.79, 0.15]}>
            <Cyl a={[0.1, 0.11, 0.07, 18]} c="#2b2f45" r={0.8} />
            <Box p={[0.08, -0.025, 0]} s={[0.12, 0.012, 0.16]} c="#1b1d2c" r={0.8} />
          </group>
        </group>
      </Interactable>
      {/* router rack */}
      <Interactable label="ארון הנתבים" standpoint="rack" onActivate={() => say('companion', R.lines.rack)}>
        <group position={[-3.15, 0, 0.6]}>
          <Box p={[0, 1.1, 0]} s={[0.7, 2.2, 0.9]} c="#1d2321" m={0.6} r={0.4} />
          {['R1', 'R2', 'R3', 'R4', 'R5', 'R6'].map((id, i) => (
            <group key={id} position={[0.36, 1.85 - i * 0.26, 0]}>
              <Box s={[0.02, 0.2, 0.78]} c="#2e3532" m={0.6} r={0.4} />
              <Leds p={[0.015, 0, 0.12]} rot={[0, Math.PI / 2, 0]} rows={2} cols={8} gap={0.04} bad={id === 'R3' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] : []} ok={id !== 'R3'} />
              <Sign p={[0.015, 0, -0.27]} rot={[0, Math.PI / 2, 0]} s={[0.16, 0.08]} lit w={128} h={64} bg={id === 'R3' ? '#3a1416' : '#14201b'} pad={8} align="center" aged={false} lines={[{ text: id, size: 40, color: id === 'R3' ? '#EF6D73' : '#9fc9b6', dir: 'ltr', align: 'center', font: 'Rubik' }]} />
            </group>
          ))}
        </group>
      </Interactable>
      {/* status board */}
      <Interactable label="לוח סטטוס הנתבים – לקרוא" standpoint="board" onActivate={() => { findClue('r3-status', R.lines.status); findClue('r3-server'); }}>
        <group position={[3.42, 1.75, 0.4]} rotation={[0, -Math.PI / 2, 0]}>
          <Box s={[1.7, 1.25, 0.06]} c="#121615" m={0.5} r={0.4} />
          <Sign p={[0, 0, 0.032]} s={[1.6, 1.15]} lit w={900} h={650} bg="#0c1813" pad={40}
            lines={[
              { text: 'סטטוס נתבים', size: 64, color: '#DDE8EF', font: 'Rubik' },
              { text: 'R1 · תקין', size: 46, color: '#65CDAA', gap: 10 },
              { text: 'R2 · תקין', size: 46, color: '#65CDAA' },
              { text: 'R3 · תקלה – לא מעביר מנות', size: 46, color: '#EF6D73' },
              { text: 'R4 · תקין', size: 46, color: '#65CDAA' },
              { text: 'R5 · תקין      R6 · תקין', size: 46, color: '#65CDAA' },
            ]} />
        </group>
      </Interactable>
      {/* cabling across the ceiling */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <Cyl key={i} p={[x, 3.3, 0]} a={[0.02, 0.02, 7, 6]} rot={[Math.PI / 2, 0, 0]} c={['#2f5d4a', '#2b2b2b', '#5d4a2f'][i]} r={0.6} />
      ))}
      <ExitDoor d={D} open={solved} accent="#5fae8e" onActivate={() => (solved ? leaveRoom(3) : say('companion', 'הדלת תיפתח כשהמנה תצא לדרך.'))} />
      <Companion position={[1.6, 0, -0.8]} facing={-0.5} onActivate={replay} />
    </>
  );
}

function RouteOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const say = useUI((s) => s.say);
  const known = useGame((s) => s.journal.includes('r3-status'));
  const [pick, setPick] = useState(null);
  const [hover, setHover] = useState(null);
  const [msg, setMsg] = useState(null);
  const [flash, setFlash] = useState(null);
  const send = () => {
    const r = ROUTES.find((x) => x.id === pick);
    if (!r) {
      setMsg({ kind: 'error', text: 'קודם בוחרים מסלול על המפה.' });
      return;
    }
    if (r.ok) {
      sfx.success();
      setMsg({ kind: 'ok', text: 'המסלול עובד. המנה יוצאת לדרך.' });
      setTimeout(() => {
        close();
        useGame.getState().solveRoom(3);
        setTimeout(() => say('companion', R.lines.solved), 600);
      }, 1100);
    } else {
      sfx.buzz();
      useGame.getState().penalize(WRONG_ROUTE_PENALTY_MS);
      setFlash(r.id);
      setTimeout(() => setFlash(null), 900);
      const line = r.reason === 'faulty' ? R.lines.wrongFaulty : R.lines.wrongLong;
      setMsg({ kind: 'error', text: line });
    }
  };
  const shown = hover || pick;
  return (
    <Device title="עמדת הניתוב" subtitle="יעד: שרת המכללה · 82.80.14.7" wide tone="green">
      <p className="criterion">
        <b>הכלל:</b> בוחרים את המסלול הקצר ביותר (הכי מעט נתבים) שעובר <b>רק</b> דרך נתבים תקינים.
      </p>
      <svg className="netmap" viewBox="0 0 760 480" role="img" aria-label="מפת הרשת: מהבית דרך נתבים אל שרת המכללה">
        {LINKS.map(([a, b]) => (
          <line key={a + b} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} className="link" />
        ))}
        {ROUTES.map((r) => (
          <polyline
            key={r.id}
            points={r.path.map((n) => `${NODES[n].x},${NODES[n].y}`).join(' ')}
            className={`route ${shown === r.id ? 'shown' : ''} ${pick === r.id ? 'picked' : ''} ${flash === r.id ? 'flash' : ''}`}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => { sfx.pick(); setPick(r.id); setMsg(null); }}
          />
        ))}
        {Object.entries(NODES).map(([id, n]) => {
          const bad = id === 'R3' && known;
          return (
            <g key={id} className={`node ${id.startsWith('R') ? 'router' : 'end'} ${bad ? 'bad' : ''}`}>
              <circle cx={n.x} cy={n.y} r={id.startsWith('R') ? 20 : 24} />
              <text x={n.x} y={n.y + 6} textAnchor="middle">{id.startsWith('R') ? id : ''}</text>
              <text x={n.x} y={n.y - 32} textAnchor="middle" className="node-label">{n.label || (id.startsWith('R') ? (bad ? 'תקלה' : known ? 'תקין' : '?') : '')}</text>
            </g>
          );
        })}
      </svg>
      {!known && <Feedback kind="info">מצב הנתבים לא מוצג כאן. הוא מופיע על לוח הסטטוס בחדר.</Feedback>}
      <div className="route-list" role="radiogroup" aria-label="מסלולים">
        {ROUTES.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={pick === r.id} className={`route-btn ${pick === r.id ? 'on' : ''}`}
            onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}
            onClick={() => { sfx.pick(); setPick(r.id); setMsg(null); }}>
            <b>{r.name}</b>
            <span dir="ltr">{routers(r).join(' → ')}</span>
            <small>{routers(r).length} נתבים</small>
          </button>
        ))}
      </div>
      <div className="device-actions">
        <button type="button" className="btn" onClick={send}>שליחה במסלול</button>
        <span className="muted small">מסלול שגוי מוריד דקה</span>
        {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
      </div>
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'route' ? <RouteOverlay /> : null;
}
