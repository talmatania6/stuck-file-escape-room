// Room 6 – Presentation: the decoding room. Find the key, decode the message.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame, useUI, findClue, leaveRoom, roomFlag } from '../../game/store';
import { JOURNAL, roomByNumber } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Sign, RoomShell, ExitDoor, RoomLights, Pl, LightPanel } from '../../engine/kit';
import { wood, sign } from '../../engine/textures';
import { Companion } from '../../companion/Companion';
import { Device, Feedback } from '../../ui/Device';
import { sfx } from '../../audio/audio';
import { RoomDressing } from '../../engine/Dressing';
import { HoloRings } from '../../engine/RoomHeroes';

const R = roomByNumber(6);
const D = 7;
const MESSAGE = '▲●■ ○◆✚◇';
const ANSWER = 'שלח קובץ';

export const standpoints = {
  center: { label: 'מרכז החדר', pos: [0, 1.6, 2.0], look: [0, 1.7, -3.5] },
  board: { label: 'לוח ההודעות', pos: [0, 1.65, -0.8], look: [0, 1.8, -3.5] },
  desk: { label: 'השולחן', pos: [-1.0, 1.45, 0.6], look: [-2.8, 0.8, 0.6] },
  machine: { label: 'מכונת הפענוח', pos: [1.2, 1.45, 0.4], look: [2.8, 0.95, 0.4] },
};

function Desk() {
  const [open, setOpen] = useState(() => roomFlag(useGame.getState(), 6, 'drawer'));
  const drawer = useRef();
  const top = useMemo(() => wood([1, 1]), []);
  const card = useMemo(() => sign({ w: 512, h: 320, bg: '#efe8f5', border: '#6d5a80', pad: 22, lines: [{ text: 'מפתח', size: 44, color: '#2a1f35', font: 'Rubik' }, { text: '▲=ש  ●=ל  ■=ח', size: 38, color: '#2a1f35', gap: 6 }, { text: '○=ק  ◆=ו  ✚=ב', size: 38, color: '#2a1f35' }, { text: '◇=ץ  △=נ  □=ת', size: 38, color: '#2a1f35' }] }), []);
  useFrame((_, dt) => {
    if (drawer.current) drawer.current.position.x += ((open ? 0.42 : 0) - drawer.current.position.x) * (1 - Math.exp(-dt * 5));
  });
  return (
    <group position={[-2.85, 0, 0.6]}>
      <Box p={[0, 0.76, 0]} s={[0.9, 0.05, 1.7]} map={top} r={0.5} />
      <Box p={[0, 0.4, -0.55]} s={[0.8, 0.7, 0.55]} c="#2e2433" r={0.7} />
      <Box p={[0, 0.4, 0.75]} s={[0.8, 0.7, 0.05]} c="#2e2433" r={0.7} />
      {/* the drawer that hides the key */}
      <Interactable label={open ? 'מגירה: לקחת את המפתח' : 'מגירה: לפתוח'} standpoint="desk"
        onActivate={() => {
          if (!open) {
            setOpen(true);
            useGame.getState().setRoomFlag(6, 'drawer');
            sfx.creak();
          } else findClue('r6-key', R.lines.key);
        }}>
        <group ref={drawer} position={[0, 0.58, 0.1]}>
          <Box p={[0.02, 0, 0]} s={[0.76, 0.16, 0.6]} c="#3a2e42" r={0.6} />
          <Box p={[0.41, 0, 0]} s={[0.02, 0.18, 0.62]} c="#4a3c54" r={0.5} />
          <Box p={[0.43, 0, 0]} s={[0.03, 0.03, 0.16]} c="#b8a07a" m={0.9} r={0.25} />
          <Pl p={[0.05, 0.081, 0]} rot={[-Math.PI / 2, 0, Math.PI / 2]} s={[0.4, 0.25]} map={card} r={0.8} />
        </group>
      </Interactable>
      {/* desk clutter: lamp, magnifier, papers */}
      <group position={[0.1, 0.78, -0.55]}>
        <Cyl p={[0, 0.02, 0]} a={[0.09, 0.1, 0.04, 18]} c="#2b2b2b" m={0.7} r={0.3} />
        <Cyl p={[0, 0.22, 0]} a={[0.012, 0.012, 0.4, 8]} c="#9aa3ab" m={0.8} r={0.3} />
        <Cyl p={[0.08, 0.42, 0]} a={[0.05, 0.12, 0.12, 18, 1, true]} rot={[0, 0, -0.6]} c="#3a2e42" m={0.6} r={0.4} />
        <pointLight position={[0.15, 0.35, 0]} intensity={1.8} distance={2.2} color="#ffd6a8" />
      </group>
      <Box p={[0.05, 0.79, 0.35]} s={[0.3, 0.005, 0.22]} rot={[0, 0.3, 0]} c="#e9e2d2" r={0.9} />
      <Box p={[0.1, 0.795, 0.42]} s={[0.3, 0.005, 0.22]} rot={[0, -0.2, 0]} c="#ddd5c4" r={0.9} />
    </group>
  );
}

export function Scene() {
  const solved = useGame((s) => s.solved.includes(6));
  const open = useUI((s) => s.openOverlay);
  const say = useUI((s) => s.say);
  const replay = useUI((s) => s.replayBubble);
  const top = useMemo(() => wood([1, 1]), []);
  return (
    <>
      <color attach="background" args={['#0c0a10']} />
      <fog attach="fog" args={['#0c0a10', 8, 18]} />
      <RoomLights fill="#e6dcef" ground="#221a2a" amount={0.55} solved={solved} />
      <RoomShell w={7} d={D} h={3.4} wall="#40364a" floor="#262229" ceil="#1d1922" pilaster="#6d5a80" cove="#f1dcff" panelCols={2} panelRows={4} seed={61} />
      <RoomDressing accent="#B49AFF" solved={solved} h={3.4} ids={['PR-06', 'PR-07']} />
      <HoloRings position={[0, 2.55, 0.5]} />
      <LightPanel p={[0, 3.38, -1.6]} s={[2.2, 0.04, 0.3]} color="#fbefff" light={6} />
      <LightPanel p={[0, 3.38, 1.0]} s={[1.2, 0.04, 0.6]} color="#fff3e6" light={6} />
      {/* glass message board */}
      <Interactable label="לוח ההודעות" standpoint="board" onActivate={() => say('companion', JOURNAL['r6-key'] && useGame.getState().journal.includes('r6-key') ? 'יש לנו מפתח. מכונת הפענוח ליד הקיר.' : R.lines.noKey)}>
        <group position={[0, 1.85, -3.35]}>
          <Box s={[3.2, 1.6, 0.04]} c="#a9c6d6" m={0.1} r={0.05} transparent opacity={0.35} />
          <Box p={[0, 0, -0.06]} s={[3.3, 1.7, 0.03]} c="#1c1823" r={0.8} />
          <Sign p={[0, 0.1, 0.03]} s={[2.8, 0.9]} lit w={1400} h={450} bg={solved ? '#1c2a24' : '#15121b'} pad={60} align="center" aged={false}
            lines={solved ? [{ text: 'שלח קובץ', size: 200, color: '#65CDAA', font: 'Rubik' }] : [{ text: MESSAGE, size: 200, color: '#e6c3ff', font: 'Rubik', align: 'center' }]} />
          {[-1.3, -0.4, 0.6, 1.3].map((x, i) => <Box key={i} p={[x, -0.68, 0.03]} s={[0.4, 0.1, 0.005]} rot={[0, 0, (i - 1.5) * 0.08]} c="#efe7d3" r={0.9} />)}
        </group>
      </Interactable>
      <Desk />
      {/* the decoding machine */}
      <Interactable label="מכונת הפענוח: להקליד" standpoint="machine" onActivate={() => (solved ? say('companion', 'כבר פוענח.') : open('decode'))}>
        <group position={[2.85, 0, 0.4]}>
          <Box p={[0, 0.72, 0]} s={[0.9, 0.05, 1.4]} map={top} r={0.5} />
          {[-0.6, 0.6].map((z) => <Box key={z} p={[0, 0.36, z]} s={[0.8, 0.72, 0.05]} c="#2e2433" r={0.7} />)}
          <Box p={[0, 0.85, 0]} s={[0.5, 0.2, 0.62]} c="#2a2a2e" m={0.6} r={0.35} />
          {Array.from({ length: 18 }, (_, i) => (
            <Cyl key={i} p={[-0.17 + Math.floor(i / 6) * 0.1, 0.97, -0.24 + (i % 6) * 0.095]} a={[0.025, 0.025, 0.03, 12]} c="#d9d2c0" m={0.4} r={0.4} />
          ))}
          <Cyl p={[0.18, 1.0, 0]} a={[0.05, 0.05, 0.6, 18]} rot={[Math.PI / 2, 0, 0]} c="#1a1a1a" m={0.5} r={0.4} />
          <Box p={[0.2, 1.1, 0]} s={[0.01, 0.18, 0.4]} rot={[0, 0, 0.2]} c="#f2eee4" r={0.9} />
          <Box p={[-0.05, 1.0, 0.36]} s={[0.12, 0.04, 0.04]} c="#000" e={solved ? '#65CDAA' : '#c08ae0'} ei={1.5} noHighlight />
        </group>
      </Interactable>
      {/* cipher wheel on the wall */}
      <group position={[3.42, 2.0, -1.8]} rotation={[0, -Math.PI / 2, 0]}>
        <Cyl a={[0.4, 0.4, 0.05, 40]} rot={[Math.PI / 2, 0, 0]} c="#3a2f44" m={0.7} r={0.35} />
        <Cyl p={[0, 0, 0.03]} a={[0.26, 0.26, 0.03, 40]} rot={[Math.PI / 2, 0, 0]} c="#7a6690" m={0.7} r={0.35} />
      </group>
      <ExitDoor d={D} open={solved} accent="#a882c9" onActivate={() => (solved ? leaveRoom(6) : say('companion', 'קודם מפענחים, אחר כך יוצאים.'))} />
      <Companion position={[-1.4, 0, -1.4]} facing={0.4} onActivate={replay} />
    </>
  );
}

const normalize = (s) => s.replace(/\s+/g, ' ').trim();

function DecodeOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const say = useUI((s) => s.say);
  const hasKey = useGame((s) => s.journal.includes('r6-key'));
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState(null);
  const input = useRef();
  useEffect(() => {
    input.current?.focus();
    if (!hasKey) say('companion', R.lines.noKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = (e) => {
    e.preventDefault();
    if (!normalize(value)) {
      setMsg({ kind: 'error', text: 'עוד לא הקלדתם כלום.' });
      return;
    }
    if (!hasKey) {
      setMsg({ kind: 'error', text: 'קודם צריך למצוא את מפתח הפענוח.' });
      return;
    }
    if (normalize(value) === ANSWER) {
      sfx.success();
      setMsg({ kind: 'ok', text: 'פוענח: ״שלח קובץ״.' });
      setTimeout(() => {
        close();
        useGame.getState().solveRoom(6);
        setTimeout(() => say('companion', R.lines.solved), 600);
      }, 1200);
    } else {
      sfx.buzz();
      setMsg({ kind: 'error', text: 'לא בדיוק. תבדקו כל סמל מול המפתח.' });
    }
  };
  return (
    <Device title="מכונת הפענוח" subtitle="מקלידים את ההודעה בעברית" tone="violet">
      <div className="cipher" aria-label={`ההודעה המוצפנת: ${MESSAGE}`}>{MESSAGE}</div>
      {hasKey ? (
        <div className="cipher-key" aria-label="מפתח הפענוח">
          {JOURNAL['r6-key'].lines.map((l) => <span key={l}>{l}</span>)}
        </div>
      ) : (
        <Feedback kind="info">{R.lines.noKey}</Feedback>
      )}
      <form className="answer-form" onSubmit={submit}>
        <label htmlFor="decode-input">ההודעה המפוענחת</label>
        <input id="decode-input" ref={input} dir="rtl" lang="he" autoComplete="off" value={value} onChange={(e) => { setValue(e.target.value); setMsg(null); }} placeholder="הקלידו כאן…" />
        <div className="device-actions">
          <button type="submit" className="btn">בדיקה</button>
          {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
        </div>
      </form>
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'decode' ? <DecodeOverlay /> : null;
}
