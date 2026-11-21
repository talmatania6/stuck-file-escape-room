// Room 2 – Data Link: the home network's sorting room.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame, useUI, findClue, leaveRoom } from '../../game/store';
import { JOURNAL, roomByNumber } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Pl, Sign, RoomShell, ExitDoor, LightPanel, RoomLights, useEase } from '../../engine/kit';
import { wood, sign } from '../../engine/textures';
import { Companion } from '../../companion/Companion';
import { Device, MatchBoard, Feedback } from '../../ui/Device';
import { sfx } from '../../audio/audio';
import { RoomDressing } from '../../engine/Dressing';
import { ScannerGantry } from '../../engine/RoomHeroes';

const R = roomByNumber(2);
const D = 7;

export const standpoints = {
  center: { label: 'מרכז החדר', pos: [0, 1.6, 2.0], look: [0, 1.3, -3.5] },
  terminal: { label: 'מסוף המיון', pos: [0, 1.5, 0.1], look: [0, 1.15, -1.9] },
  devices: { label: 'שולחן המכשירים', pos: [1.0, 1.45, 0], look: [3.5, 1.0, 0] },
  mail: { label: 'תאי הדואר', pos: [-1.2, 1.6, 0.4], look: [-3.5, 1.5, 0.4] },
};

const DEVICES = [
  { id: 'r2-laptop', z: -1.3, label: 'המחשב הנייד של נועה' },
  { id: 'r2-phone', z: 0, label: 'הטלפון של אבא' },
  { id: 'r2-printer', z: 1.3, label: 'המדפסת' },
];

function inspectDevice(id) {
  const isNew = findClue(id, R.lines.device);
  const g = useGame.getState();
  if (isNew && DEVICES.every((d) => g.journal.includes(d.id))) {
    setTimeout(() => useUI.getState().say('companion', R.lines.allFound), 1800);
  }
}

function Sticker({ id, p, rot }) {
  const mac = JOURNAL[id].lines[0];
  const tex = useMemo(() => sign({ w: 384, h: 96, bg: '#f2efe6', pad: 18, align: 'center', aged: false, lines: [{ text: mac, size: 30, color: '#1b2430', dir: 'ltr', font: 'Courier New' }] }), [mac]);
  return <Pl p={p} rot={rot} s={[0.16, 0.04]} map={tex} r={0.6} />;
}

function Devices({ solved }) {
  const top = useMemo(() => wood([2, 1]), []);
  const leds = useRef([]);
  useFrame(({ clock }) => {
    leds.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = solved ? 2 : Math.sin(clock.elapsedTime * 3 + i) > 0.6 ? 2 : 0.2;
    });
  });
  const led = (i, p) => (
    <mesh position={p} userData={{ noHighlight: true }}>
      <sphereGeometry args={[0.012, 8, 6]} />
      <meshStandardMaterial ref={(el) => (leds.current[i] = el)} color="#111" emissive={solved ? '#65CDAA' : '#FFB547'} emissiveIntensity={1} toneMapped={false} />
    </mesh>
  );
  return (
    <group>
      {/* long table along the east wall */}
      <Box p={[3.05, 0.78, 0]} s={[0.75, 0.05, 3.9]} map={top} r={0.6} />
      {[-1.8, 1.8].map((z) => <Box key={z} p={[3.05, 0.38, z]} s={[0.65, 0.76, 0.05]} c="#2f353b" m={0.6} r={0.4} />)}
      {/* laptop */}
      <Interactable label="המחשב הנייד של נועה: לבדוק" standpoint="devices" onActivate={() => inspectDevice('r2-laptop')}>
        <group position={[3.0, 0.81, DEVICES[0].z]}>
          <Box p={[0, 0.012, 0]} s={[0.34, 0.022, 0.48]} c="#b9c0c7" m={0.8} r={0.3} />
          <group position={[0.17, 0.02, 0]} rotation={[0, 0, -0.22]}>
            <Box p={[0, 0.17, 0]} s={[0.018, 0.34, 0.48]} c="#b9c0c7" m={0.8} r={0.3} />
            <Box p={[-0.011, 0.17, 0]} s={[0.002, 0.3, 0.44]} c="#000" e="#4d6f8c" ei={0.6} noHighlight />
          </group>
          <Sticker id="r2-laptop" p={[-0.171, 0.012, 0.1]} rot={[0, -Math.PI / 2, 0]} />
          {led(0, [-0.172, 0.012, -0.18])}
        </group>
      </Interactable>
      {/* phone on a dock */}
      <Interactable label="הטלפון של אבא: לבדוק" standpoint="devices" onActivate={() => inspectDevice('r2-phone')}>
        <group position={[3.0, 0.81, DEVICES[1].z]}>
          <Box p={[0, 0.03, 0]} s={[0.14, 0.06, 0.16]} c="#2b2f34" m={0.6} r={0.4} />
          <Box p={[0.01, 0.15, 0]} s={[0.02, 0.2, 0.1]} rot={[0, 0, 0.25]} c="#15181b" m={0.5} r={0.25} />
          <Box p={[-0.003, 0.15, 0]} s={[0.002, 0.17, 0.085]} rot={[0, 0, 0.25]} c="#000" e="#5b7a6b" ei={0.5} noHighlight />
          <Sticker id="r2-phone" p={[-0.071, 0.03, 0]} rot={[0, -Math.PI / 2, 0]} />
          {led(1, [-0.071, 0.05, 0.065])}
        </group>
      </Interactable>
      {/* printer */}
      <Interactable label="המדפסת: לבדוק" standpoint="devices" onActivate={() => inspectDevice('r2-printer')}>
        <group position={[3.0, 0.81, DEVICES[2].z]}>
          <Box p={[0, 0.13, 0]} s={[0.42, 0.26, 0.5]} c="#d8dadc" m={0.2} r={0.5} />
          <Box p={[-0.1, 0.27, 0]} s={[0.2, 0.02, 0.4]} c="#3a3f45" m={0.4} r={0.5} />
          <Box p={[-0.25, 0.08, 0]} s={[0.1, 0.01, 0.34]} c="#f4f1ea" r={0.8} />
          <Sticker id="r2-printer" p={[-0.211, 0.2, 0.12]} rot={[0, -Math.PI / 2, 0]} />
          {led(2, [-0.211, 0.2, -0.18])}
        </group>
      </Interactable>
      {/* network switch on the wall, cables running to each device */}
      <Box p={[3.45, 1.55, 0]} s={[0.1, 0.12, 0.9]} c="#1f2428" m={0.6} r={0.4} />
      <Sign p={[3.39, 1.66, 0]} rot={[0, -Math.PI / 2, 0]} s={[0.5, 0.06]} lit w={512} h={64} bg="#1f2428" pad={10} align="center" aged={false} lines={[{ text: 'SWITCH · 8 PORTS', size: 34, color: '#9fb3c6', dir: 'ltr', font: 'Rubik' }]} />
      {DEVICES.map((d, i) => (
        <Cyl key={d.id} p={[3.42, 1.15, d.z * 0.85]} a={[0.012, 0.012, 0.8, 6]} rot={[d.z * 0.35, 0, 0]} c={['#2f5d8a', '#2b2b2b', '#8a5b2f'][i]} r={0.6} />
      ))}
    </group>
  );
}

function Conveyor({ solved }) {
  const go = useEase(solved, 0.5);
  const parcels = useRef([]);
  const labels = useMemo(
    () => ['א', 'ב', 'ג'].map((l) => sign({ w: 256, h: 160, bg: '#e6dcc8', pad: 18, align: 'center', lines: [{ text: `חבילה ${l}`, size: 46, color: '#2a2016' }, { text: 'יעד: ??:??:??', size: 30, color: '#7a3b22', dir: 'ltr', align: 'center' }] })),
    [],
  );
  useFrame((_, dt) => {
    parcels.current.forEach((p, i) => {
      if (!p) return;
      if (go.current > 0.5) {
        p.position.x = Math.min(p.position.x + dt * 0.9, 3.0 + i * 0.4);
        p.visible = p.position.x < 2.9;
      }
    });
  });
  return (
    <group position={[0, 0, -2.75]}>
      <Box p={[0, 0.82, 0]} s={[6.2, 0.08, 0.7]} c="#222629" m={0.4} r={0.7} />
      {Array.from({ length: 22 }, (_, i) => (
        <Cyl key={i} p={[-3 + i * 0.28, 0.77, 0]} a={[0.035, 0.035, 0.72, 10]} rot={[Math.PI / 2, 0, 0]} c="#8f99a3" m={0.8} r={0.3} />
      ))}
      {[-2.6, 0, 2.6].map((x) => (
        <group key={x}>
          <Box p={[x, 0.38, -0.3]} s={[0.06, 0.76, 0.06]} c="#3a4048" m={0.6} r={0.4} />
          <Box p={[x, 0.38, 0.3]} s={[0.06, 0.76, 0.06]} c="#3a4048" m={0.6} r={0.4} />
        </group>
      ))}
      <Box p={[0, 0.9, -0.38]} s={[6.2, 0.12, 0.04]} c="#d9a33e" m={0.3} r={0.6} />
      {[-1.6, -0.2, 1.2].map((x, i) => (
        <group key={i} ref={(el) => (parcels.current[i] = el)} position={[x, 1.03, 0]}>
          <Box s={[0.5, 0.34, 0.42]} c="#a07a52" r={0.85} />
          <Box p={[0, 0.172, 0]} s={[0.5, 0.005, 0.08]} c="#c9b48a" r={0.7} />
          <Pl p={[0, 0, 0.212]} s={[0.36, 0.22]} map={labels[i]} r={0.8} />
        </group>
      ))}
      {/* chute on the right end */}
      <Box p={[3.15, 1.25, 0]} s={[0.4, 1.0, 0.9]} c="#3a4550" m={0.6} r={0.45} />
      <Box p={[2.94, 1.05, 0]} s={[0.02, 0.5, 0.6]} c="#05070a" r={1} />
    </group>
  );
}

function Terminal({ solved }) {
  const open = useUI((s) => s.openOverlay);
  return (
    <group position={[0, 0, -1.75]}>
      <Interactable label="מסוף המיון: לשבץ חבילות" standpoint="terminal" onActivate={() => (solved ? useUI.getState().say('companion', 'כל החבילות כבר נמסרו.') : open('sort'))}>
        <Box p={[0, 0.45, 0]} s={[1.3, 0.9, 0.5]} c="#3a4550" m={0.55} r={0.45} />
        <Box p={[0, 0.91, 0]} s={[1.36, 0.04, 0.56]} c="#1d2227" m={0.5} r={0.35} />
        <group position={[0, 1.18, -0.05]} rotation={[-0.3, 0, 0]}>
          <Box s={[0.9, 0.52, 0.05]} c="#15191d" m={0.5} r={0.4} />
          <Sign p={[0, 0, 0.027]} s={[0.84, 0.46]} lit w={768} h={420} bg={solved ? '#0e2a22' : '#0c1a24'} pad={40} align="center" aged={false}
            lines={solved ? [{ text: 'המיון הושלם', size: 72, color: '#65CDAA', font: 'Rubik' }] : [{ text: 'מסוף המיון', size: 66, color: '#DDE8EF', font: 'Rubik' }, { text: '3 חבילות ממתינות', size: 46, color: '#FFB547', gap: 20 }, { text: 'לחצו כדי לשבץ', size: 38, color: '#9fb3c6', gap: 16 }]} />
        </group>
      </Interactable>
    </group>
  );
}

function MailWall() {
  return (
    <group position={[-3.42, 0, 0.4]}>
      {Array.from({ length: 24 }, (_, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        return (
          <group key={i} position={[0, 1.0 + row * 0.32, -1.0 + col * 0.36]}>
            <Box s={[0.12, 0.3, 0.34]} c="#5b4636" r={0.7} />
            <Box p={[0.04, 0, 0]} s={[0.05, 0.25, 0.29]} c="#120d09" r={1} />
            {(i * 7) % 5 === 0 && <Box p={[0.06, -0.06, 0]} s={[0.02, 0.1, 0.22]} c="#e9e2d2" r={0.8} />}
          </group>
        );
      })}
      <Interactable label="שלט המיון: לקרוא" standpoint="mail" onActivate={() => findClue('r2-rule', 'כלל אחד בלבד בחדר הזה: הכתובת קובעת, לא השם. שמרתי ביומן.')}>
        <Sign p={[0.08, 2.5, 0]} rot={[0, Math.PI / 2, 0]} s={[1.6, 0.36]} w={1024} h={230} bg="#e6dcc8" border="#5b4636" pad={30} align="center"
          lines={[{ text: 'נוהל מיון', size: 64, color: '#2a2016', font: 'Rubik' }, { text: 'כל חבילה נמסרת לפי כתובת ה-MAC של היעד', size: 44, color: '#2a2016', weight: 500 }]} />
      </Interactable>
    </group>
  );
}

export function Scene() {
  const solved = useGame((s) => s.solved.includes(2));
  const replay = useUI((s) => s.replayBubble);
  return (
    <>
      <color attach="background" args={['#0b0f14']} />
      <fog attach="fog" args={['#0b0f14', 8, 18]} />
      <RoomLights fill="#dbe4ee" ground="#2a2622" amount={0.65} solved={solved} />
      <RoomShell w={7} d={D} h={3.6} wall="#4f5f70" floor="#2f3236" ceil="#23272b" pilaster="#9aa6b2" cove="#e9f1ff" seed={21} />
      <RoomDressing accent="#78BCE8" solved={solved} h={3.6} ids={['SW-01', 'SW-02']} />
      <ScannerGantry accent="#78BCE8" />
      <LightPanel p={[-1.2, 3.58, -1]} color="#eef4ff" light={9} />
      <LightPanel p={[1.6, 3.58, 0.6]} color="#eef4ff" light={9} />
      <Conveyor solved={solved} />
      <Terminal solved={solved} />
      <Devices solved={solved} />
      <MailWall />
      {/* trolley with spare parcels */}
      <group position={[-2.6, 0, 2.4]}>
        <Box p={[0, 0.3, 0]} s={[0.9, 0.04, 0.6]} c="#59636d" m={0.7} r={0.4} />
        <Box p={[0, 0.5, 0]} s={[0.5, 0.36, 0.4]} c="#9a7550" r={0.85} />
        <Box p={[0.1, 0.8, 0]} s={[0.36, 0.24, 0.3]} c="#a88560" r={0.85} />
        <Box p={[-0.45, 0.6, 0]} s={[0.04, 0.6, 0.6]} c="#59636d" m={0.7} r={0.4} />
      </group>
      <ExitDoor d={D} open={solved} onActivate={() => (solved ? leaveRoom(2) : useUI.getState().say('companion', 'הדלת תיפתח כשכל החבילות יגיעו ליעד.'))} />
      <Companion position={[-2.4, 0, -0.9]} facing={0.5} onActivate={replay} />
    </>
  );
}

const PARCELS = [
  { id: 'a', name: 'חבילה א', content: 'עבודה_סופית.pdf', mac: 'F0:18:98:4D:7A:02' },
  { id: 'b', name: 'חבילה ב', content: 'מסמך להדפסה', mac: '3C:22:FB:9A:01:7E' },
  { id: 'c', name: 'חבילה ג', content: 'תמונה מהטיול', mac: 'A4:5E:60:C2:11:B3' },
];
const TARGETS = [
  { id: 'r2-laptop', name: 'המחשב הנייד של נועה' },
  { id: 'r2-phone', name: 'הטלפון של אבא' },
  { id: 'r2-printer', name: 'המדפסת' },
];
const SOLUTION = { 'r2-laptop': 'a', 'r2-phone': 'b', 'r2-printer': 'c' };

function SortOverlay() {
  const journal = useGame((s) => s.journal);
  const close = useUI((s) => s.closeOverlay);
  const missing = TARGETS.filter((t) => !journal.includes(t.id)).length;
  return (
    <Device title="מסוף המיון" subtitle="גררו כל חבילה אל המכשיר שלה" wide>
      {missing > 0 && <Feedback kind="info">{R.lines.missing} ({missing} מכשירים לא נבדקו)</Feedback>}
      <MatchBoard
        items={PARCELS}
        targets={TARGETS}
        solution={SOLUTION}
        renderItem={(p) => (
          <span className="parcel">
            <b>{p.name}</b>
            <small>{p.content}</small>
            <small>כתובת היעד:</small>
            <code dir="ltr">{p.mac}</code>
          </span>
        )}
        renderTarget={(t) => (
          <span className="device-target">
            <b>{t.name}</b>
            <code dir="ltr">{journal.includes(t.id) ? JOURNAL[t.id].lines[0] : 'MAC: ? (בדקו את המכשיר)'}</code>
          </span>
        )}
        onWrong={() => useUI.getState().say('companion', R.lines.wrong)}
        onSolved={() =>
          setTimeout(() => {
            close();
            useGame.getState().solveRoom(2);
            sfx.powerUp();
            setTimeout(() => useUI.getState().say('companion', R.lines.solved), 800);
          }, 900)
        }
      />
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'sort' ? <SortOverlay /> : null;
}
