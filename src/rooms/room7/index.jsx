// Room 7 – Application: the reception hall with three service windows.
import { useMemo } from 'react';
import { useGame, useUI, findClue, leaveRoom } from '../../game/store';
import { roomByNumber, LECTURER_EMAIL } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Sign, RoomShell, ExitDoor, RoomLights, LightPanel } from '../../engine/kit';
import { wood } from '../../engine/textures';
import { Companion } from '../../companion/Companion';
import { Device, MatchBoard } from '../../ui/Device';
import { sfx } from '../../audio/audio';
import { RoomDressing } from '../../engine/Dressing';
import { CounterGlow } from '../../engine/RoomHeroes';

const R = roomByNumber(7);
const D = 7;

export const standpoints = {
  center: { label: 'מרכז הלובי', pos: [0, 1.6, 2.0], look: [0, 1.6, -3.5] },
  counter: { label: 'הדלפק', pos: [0, 1.55, -0.3], look: [0, 1.3, -2.6] },
  board: { label: 'לוח המודעות', pos: [-1.2, 1.6, 0.6], look: [-3.5, 1.6, 0.6] },
};

const WINDOWS = [
  { id: 'w1', num: 'חלון 1', proto: 'HTTP/HTTPS', desc: 'אתרים ודפי אינטרנט' },
  { id: 'w2', num: 'חלון 2', proto: 'SMTP', desc: 'שליחת דואר אלקטרוני' },
  { id: 'w3', num: 'חלון 3', proto: 'FTP', desc: 'העברת קבצים לשרת' },
];

export function Scene() {
  const solved = useGame((s) => s.solved.includes(7));
  const open = useUI((s) => s.openOverlay);
  const say = useUI((s) => s.say);
  const replay = useUI((s) => s.replayBubble);
  const counter = useMemo(() => wood([2, 1]), []);
  return (
    <>
      <color attach="background" args={['#0f0e0b']} />
      <fog attach="fog" args={['#0f0e0b', 8, 18]} />
      <RoomLights fill="#f3ead8" ground="#2a2418" amount={0.65} solved={solved} />
      <RoomShell w={7} d={D} h={3.8} wall="#d7d0c2" floor="#3b3a37" ceil="#2b2925" pilaster="#b39552" cove="#fff2d6" panelCols={3} panelRows={3} seed={71} />
      <RoomDressing accent="#E7C16D" solved={solved} h={3.8} units={false} />
      <CounterGlow solved={solved} />
      <LightPanel p={[-1.6, 3.78, 0.6]} color="#fff6e6" light={8} />
      <LightPanel p={[1.6, 3.78, 0.6]} color="#fff6e6" light={8} />
      {/* service windows behind the counter */}
      {WINDOWS.map((w, i) => {
        const x = -2.0 + i * 2.0;
        return (
          <group key={w.id} position={[x, 0, -3.3]}>
            <Box p={[0, 1.6, 0]} s={[1.6, 1.3, 0.12]} c="#2f3a46" m={0.6} r={0.4} />
            <Box p={[0, 1.55, 0.07]} s={[1.3, 0.95, 0.02]} c="#b9d3e2" m={0.1} r={0.05} transparent opacity={0.3} />
            <Sign p={[0, 2.55, 0.08]} s={[1.5, 0.5]} lit w={900} h={300} bg="#1f2a35" pad={26} align="center" aged={false}
              lines={[{ text: w.num, size: 60, color: '#d9b25f', font: 'Rubik' }, { text: w.proto, size: 72, color: '#ffffff', dir: 'ltr', align: 'center', font: 'Rubik' }, { text: w.desc, size: 44, color: '#c9d4dd' }]} />
            <Box p={[0, 0.95, 0.1]} s={[0.2, 0.06, 0.04]} c="#000" e={solved ? '#65CDAA' : '#d9b25f'} ei={1.2} noHighlight />
          </group>
        );
      })}
      {/* the counter with the forms tray */}
      <Interactable label="דלפק הקבלה: טפסים" standpoint="counter" onActivate={() => (solved ? say('companion', 'כל הבקשות כבר אושרו.') : open('forms'))}>
        <group position={[0, 0, -2.4]}>
          <Box p={[0, 0.55, 0]} s={[6.4, 1.1, 0.6]} map={counter} r={0.5} />
          <Box p={[0, 1.12, 0]} s={[6.5, 0.05, 0.7]} c="#e9e4d8" m={0.1} r={0.3} />
          <Box p={[0, 1.18, 0.1]} s={[0.5, 0.06, 0.36]} c="#3a3f45" m={0.6} r={0.4} />
          {[0, 1, 2].map((k) => <Box key={k} p={[0.02 * k, 1.22 + k * 0.012, 0.1]} s={[0.36, 0.006, 0.26]} rot={[0, 0.1 * k, 0]} c="#f4f1ea" r={0.9} />)}
          {/* rubber stamp */}
          <group position={[0.6, 1.15, 0.12]}>
            <Cyl p={[0, 0.03, 0]} a={[0.05, 0.05, 0.04, 16]} c="#7a2b2b" r={0.6} />
            <Cyl p={[0, 0.1, 0]} a={[0.02, 0.025, 0.1, 12]} c="#3a2a1e" r={0.6} />
          </group>
          <Box p={[-1.2, 1.2, 0.1]} s={[0.12, 0.12, 0.1]} c="#d9b25f" m={0.8} r={0.3} />
        </group>
      </Interactable>
      {/* ticket machine */}
      <group position={[2.9, 0, 0.8]}>
        <Box p={[0, 0.65, 0]} s={[0.4, 1.3, 0.35]} c="#b39552" m={0.6} r={0.35} />
        <Sign p={[-0.21, 1.1, 0]} rot={[0, -Math.PI / 2, 0]} s={[0.3, 0.2]} lit w={300} h={200} bg="#1f2a35" pad={22} align="center" aged={false} lines={[{ text: 'מספר', size: 40, color: '#c9d4dd' }, { text: '042', size: 80, color: '#FFB547', dir: 'ltr', align: 'center', font: 'Rubik' }]} />
      </group>
      {/* waiting chairs */}
      {[0.6, 1.3, 2.0].map((z) => (
        <group key={z} position={[-2.9, 0, z]}>
          <Box p={[0, 0.45, 0]} s={[0.5, 0.06, 0.5]} c="#2f3a46" r={0.7} />
          <Box p={[-0.23, 0.75, 0]} s={[0.05, 0.6, 0.5]} c="#2f3a46" r={0.7} />
          <Cyl p={[0, 0.22, 0]} a={[0.025, 0.025, 0.44, 8]} c="#9aa3ab" m={0.8} r={0.3} />
        </group>
      ))}
      {/* notice board with the course staff card */}
      <group position={[-3.42, 1.65, -0.8]} rotation={[0, Math.PI / 2, 0]}>
        <Box s={[1.4, 0.9, 0.04]} c="#8a6a4a" r={0.9} />
        {[[-0.4, 0.2, '#f4f1ea'], [0.35, 0.25, '#fff3b0'], [-0.25, -0.22, '#d6ecf7']].map(([x, y, c], i) => (
          <Box key={i} p={[x, y, 0.025]} s={[0.36, 0.26, 0.005]} rot={[0, 0, (i - 1) * 0.06]} c={c} r={0.9} />
        ))}
        <Interactable label="כרטיס סגל הקורס: לקרוא" standpoint="board" onActivate={() => findClue('r7-email', R.lines.card)}>
          <Sign p={[0.35, -0.2, 0.03]} s={[0.5, 0.3]} w={512} h={300} bg="#ffffff" border="#d9b25f" pad={24}
            lines={[{ text: 'סגל הקורס', size: 44, color: '#1b2430', font: 'Rubik' }, { text: 'ד״ר לוי, מרצה', size: 36, color: '#1b2430', gap: 8 }, { text: LECTURER_EMAIL, size: 30, color: '#1b2430', dir: 'ltr', font: 'Courier New' }]} />
        </Interactable>
      </group>
      <ExitDoor d={D} open={solved} accent="#d9b25f" onActivate={() => (solved ? leaveRoom(7) : say('companion', 'אף אחד לא יוצא בלי חותמת.'))} />
      <Companion position={[2.4, 0, -0.8]} facing={-0.4} onActivate={replay} />
    </>
  );
}

const FORMS = [
  { id: 'f1', title: 'בקשה: לפתוח את אתר הקורס', icon: 'אתר' },
  { id: 'f2', title: 'בקשה: לשלוח מייל למרצה', icon: 'מייל' },
  { id: 'f3', title: 'בקשה: להעלות קובץ לשרת הקבצים (FTP)', icon: 'קובץ' },
];
const SOLUTION = { w1: 'f1', w2: 'f2', w3: 'f3' };

function FormsOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const say = useUI((s) => s.say);
  return (
    <Device title="דלפק הקבלה" subtitle="גררו כל טופס לחלון שמטפל בו" wide tone="gold">
      <MatchBoard
        items={FORMS}
        targets={WINDOWS}
        solution={SOLUTION}
        checkLabel="הגשה"
        stampOnOk
        renderItem={(f) => (
          <span className="form-item">
            <small>{f.icon}</small>
            <b>{f.title}</b>
          </span>
        )}
        renderTarget={(w) => (
          <span className="window-target">
            <small>{w.num}</small>
            <b dir="ltr">{w.proto}</b>
            <span>{w.desc}</span>
          </span>
        )}
        onWrong={() => say('companion', R.lines.wrong)}
        onSolved={() =>
          setTimeout(() => {
            close();
            sfx.stamp();
            useGame.getState().solveRoom(7);
            setTimeout(() => say('companion', R.lines.solved), 600);
          }, 1500)
        }
      />
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'forms' ? <FormsOverlay /> : null;
}
