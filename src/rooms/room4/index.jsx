// Room 4 – Transport: the warehouse. Two rounds, UDP then TCP.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame, useUI, leaveRoom } from '../../game/store';
import { roomByNumber } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Sign, RoomShell, ExitDoor, LightPanel, RoomLights, Pl, useEase } from '../../engine/kit';
import { hazard, sign, wood } from '../../engine/textures';
import { Companion } from '../../companion/Companion';
import { Device, Feedback } from '../../ui/Device';
import { sfx } from '../../audio/audio';
import { RoomDressing } from '../../engine/Dressing';
import { CrateRail } from '../../engine/RoomHeroes';

const R = roomByNumber(4);
const D = 7;

export const standpoints = {
  center: { label: 'מרכז המחסן', pos: [0, 1.6, 2.0], look: [0, 1.3, -3.5] },
  console: { label: 'מסוף המשלוחים', pos: [0.9, 1.55, 0.2], look: [1.6, 1.2, -1.6] },
  shelves: { label: 'המדפים', pos: [-0.8, 1.6, 0.5], look: [-3.5, 1.5, 0.5] },
};

const UDP_Q = [
  { q: 'באיזו שכבה ביטים עוברים כאותות חשמל, אור או רדיו?', a: ['הפיזית', 'הרשת', 'היישום'], ok: 0 },
  { q: 'לפי מה שכבת הקו יודעת לאיזה מכשיר ברשת הביתית לשלוח?', a: ['כתובת IP', 'כתובת MAC', 'שם הקובץ'], ok: 1 },
  { q: 'מי בוחר את הדרך בין רשתות שונות?', a: ['מתג', 'כבל', 'נתב'], ok: 2 },
  { q: 'בשיחת וידאו, מה חשוב יותר?', a: ['שהתמונה תזרום בלי עיכוב', 'שכל פריים יגיע, גם באיחור'], ok: 0 },
];
const TCP_Q = [
  { q: 'קובץ שחייב להגיע שלם, באיזה פרוטוקול שולחים?', a: ['UDP', 'TCP'], ok: 1 },
  { q: 'מה TCP עושה כשחלק לא הגיע?', a: ['מוותר עליו', 'שולח אותו שוב', 'מוחק את כל הקובץ'], ok: 1 },
  { q: 'למה החלקים ממוספרים?', a: ['כדי שיהיו מהירים יותר', 'כדי להצפין אותם', 'כדי לסדר אותם מחדש ולגלות מה חסר'], ok: 2 },
];
const UDP_SECONDS = 10;

function Crates({ solved }) {
  const go = useEase(solved, 0.6);
  const moving = useRef([]);
  const tags = useMemo(() => [1, 2, 3, 4, 5].map((k) => sign({ w: 128, h: 128, bg: '#e6dcc8', pad: 10, align: 'center', lines: [{ text: String(k), size: 90, color: '#2a2016', font: 'Rubik', dir: 'ltr', align: 'center' }] })), []);
  const crate = useMemo(() => wood([1, 1]), []);
  useFrame((_, dt) => {
    moving.current.forEach((c, i) => {
      if (!c) return;
      if (go.current > 0.5) c.position.x = Math.min(c.position.x + dt * 0.7, 3.4);
    });
  });
  return (
    <group>
      {/* conveyor with scanner arch */}
      <group position={[0, 0, -2.7]}>
        <Box p={[0, 0.7, 0]} s={[6.4, 0.08, 0.8]} c="#26292c" m={0.4} r={0.7} />
        {Array.from({ length: 24 }, (_, i) => (
          <Cyl key={i} p={[-3.1 + i * 0.27, 0.65, 0]} a={[0.035, 0.035, 0.82, 10]} rot={[Math.PI / 2, 0, 0]} c="#8f99a3" m={0.8} r={0.3} />
        ))}
        {[-2.8, 0, 2.8].map((x) => <Box key={x} p={[x, 0.33, 0]} s={[0.08, 0.66, 0.7]} c="#3a3532" m={0.6} r={0.4} />)}
        <group position={[0.4, 0, 0]}>
          <Box p={[0, 1.3, -0.5]} s={[0.12, 1.3, 0.12]} c="#c9763f" m={0.5} r={0.5} />
          <Box p={[0, 1.3, 0.5]} s={[0.12, 1.3, 0.12]} c="#c9763f" m={0.5} r={0.5} />
          <Box p={[0, 1.98, 0]} s={[0.2, 0.12, 1.12]} c="#c9763f" m={0.5} r={0.5} />
          <Box p={[0, 1.91, 0]} s={[0.04, 0.02, 0.9]} c="#000" e={solved ? '#65CDAA' : '#EF6D73'} ei={1.6} noHighlight />
        </group>
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} ref={(el) => (moving.current[i] = el)} position={[-2.6 + i * 0.62, 0.95, 0]}>
            <Box s={[0.42, 0.4, 0.42]} map={crate} r={0.8} />
            <Pl p={[0, 0, 0.212]} s={[0.2, 0.2]} map={tags[i]} r={0.8} />
          </group>
        ))}
      </group>
      {/* shelving on the west wall */}
      <group position={[-3.05, 0, 0.5]}>
        {[0.05, 0.85, 1.65, 2.45].map((y) => <Box key={y} p={[0, y, 0]} s={[0.7, 0.05, 3.2]} c="#c9763f" m={0.5} r={0.5} />)}
        {[-1.55, 0, 1.55].map((z) => <Box key={z} p={[0, 1.3, z]} s={[0.7, 2.6, 0.06]} c="#3a3532" m={0.6} r={0.4} />)}
        {Array.from({ length: 12 }, (_, i) => (
          <Box key={i} p={[0, 0.3 + Math.floor(i / 4) * 0.8, -1.2 + (i % 4) * 0.8]} s={[0.5, 0.42 + (i % 3) * 0.06, 0.55]} map={crate} r={0.85} />
        ))}
      </group>
      {/* pallet stack in the corner */}
      <group position={[2.6, 0, 2.5]}>
        {[0, 0.14, 0.28].map((y) => <Box key={y} p={[0, y + 0.06, 0]} s={[1.0, 0.12, 0.8]} map={crate} r={0.9} />)}
      </group>
    </group>
  );
}

export function Scene() {
  const solved = useGame((s) => s.solved.includes(4));
  const open = useUI((s) => s.openOverlay);
  const say = useUI((s) => s.say);
  const replay = useUI((s) => s.replayBubble);
  const floorLine = useMemo(() => hazard([6, 1]), []);
  return (
    <>
      <color attach="background" args={['#0d0c0b']} />
      <fog attach="fog" args={['#0d0c0b', 8, 18]} />
      <RoomLights fill="#ece2d6" ground="#2a2018" amount={0.62} solved={solved} />
      <RoomShell w={7} d={D} h={3.8} wall="#5a5550" floor="#3a3a38" ceil="#24221f" pilaster="#6e5444" cove="#ffe1c2" panelCols={3} panelRows={2} seed={41} />
      <RoomDressing accent="#F0A56C" solved={solved} h={3.8} ids={['TR-04', 'TR-05']} />
      <CrateRail y={3.45} z={-0.4} />
      <LightPanel p={[-1.4, 3.78, -1.2]} color="#fff0dc" light={9} />
      <LightPanel p={[1.4, 3.78, 0.8]} color="#fff0dc" light={9} />
      <Pl p={[0, 0.005, -2.0]} rot={[-Math.PI / 2, 0, 0]} s={[6.4, 0.12]} map={floorLine} r={0.7} />
      <Crates solved={solved} />
      <Interactable label="מסוף המשלוחים: להתחיל" standpoint="console" onActivate={() => (solved ? say('companion', 'כל החלקים כבר הגיעו.') : open('ship'))}>
        <group position={[1.6, 0, -1.5]}>
          <Box p={[0, 0.55, 0]} s={[0.7, 1.1, 0.5]} c="#3a3532" m={0.6} r={0.45} />
          <group position={[0, 1.3, 0.02]} rotation={[-0.35, 0, 0]}>
            <Box s={[0.66, 0.44, 0.05]} c="#141517" m={0.5} r={0.4} />
            <Sign p={[0, 0, 0.027]} s={[0.6, 0.38]} lit w={600} h={380} bg="#16110c" pad={30} align="center" aged={false}
              lines={solved ? [{ text: '5/5 הגיעו', size: 72, color: '#65CDAA', font: 'Rubik' }] : [{ text: 'משלוחים', size: 62, color: '#DDE8EF', font: 'Rubik' }, { text: 'UDP · TCP', size: 52, color: '#FFB547', dir: 'ltr', align: 'center', gap: 14 }, { text: 'לחצו כדי להתחיל', size: 36, color: '#b9a99a', gap: 10 }]} />
          </group>
        </group>
      </Interactable>
      <ExitDoor d={D} open={solved} accent="#c9763f" onActivate={() => (solved ? leaveRoom(4) : say('companion', 'קודם המשלוחים, אחר כך הדלת.'))} />
      <Companion position={[2.4, 0, -1.4]} facing={0.3} onActivate={replay} />
    </>
  );
}

/* ---------------- the shipping console ---------------- */

function Packets({ list }) {
  return (
    <div className="packets" aria-label="מצב החבילות">
      {list.map((p, i) => (
        <span key={i} className={`packet ${p}`}>
          {i + 1}
          <small>{p === 'ok' ? 'הגיע' : p === 'lost' ? 'אבד' : p === 'resend' ? 'שוב' : p === 'now' ? 'בדרך' : ''}</small>
        </span>
      ))}
    </div>
  );
}

function ShipOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const say = useUI((s) => s.say);
  const [round, setRound] = useState('intro'); // intro | udp | udpDone | tcp | done
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(UDP_SECONDS);
  const [udpRes, setUdpRes] = useState(UDP_Q.map(() => ''));
  const [tcpRes, setTcpRes] = useState(TCP_Q.map(() => ''));
  const [msg, setMsg] = useState(null);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    if (round !== 'udp') return;
    setLeft(UDP_SECONDS);
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [round, i]);
  useEffect(() => {
    if (round === 'udp' && left <= 0 && !lock) answerUdp(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const answerUdp = (k) => {
    if (lock) return;
    setLock(true);
    const ok = k === UDP_Q[i].ok;
    ok ? sfx.drop() : sfx.buzz();
    setUdpRes((r) => r.map((v, j) => (j === i ? (ok ? 'ok' : 'lost') : v)));
    setMsg(ok ? { kind: 'ok', text: 'החבילה הגיעה.' } : { kind: 'error', text: k === -1 ? 'נגמר הזמן, החבילה אבדה, ואף אחד לא שולח אותה שוב.' : 'תשובה לא נכונה, החבילה אבדה, ואף אחד לא שולח אותה שוב.' });
    setTimeout(() => {
      setLock(false);
      setMsg(null);
      if (i < UDP_Q.length - 1) setI(i + 1);
      else {
        setRound('udpDone');
        say('companion', R.lines.udpDone);
      }
    }, 1500);
  };

  const answerTcp = (k) => {
    if (lock) return;
    const ok = k === TCP_Q[i].ok;
    if (ok) {
      sfx.drop();
      setLock(true);
      setTcpRes((r) => r.map((v, j) => (j === i ? 'ok' : v)));
      setMsg({ kind: 'ok', text: 'אישור (ACK) התקבל. החלק הבא.' });
      setTimeout(() => {
        setLock(false);
        setMsg(null);
        if (i < TCP_Q.length - 1) setI(i + 1);
        else {
          setRound('done');
          sfx.success();
          setTimeout(() => {
            close();
            useGame.getState().solveRoom(4);
            setTimeout(() => say('companion', R.lines.solved), 700);
          }, 1600);
        }
      }, 1100);
    } else {
      sfx.buzz();
      setTcpRes((r) => r.map((v, j) => (j === i ? 'resend' : v)));
      setMsg({ kind: 'error', text: `${R.lines.resend} נסו שוב.` });
    }
  };

  const q = round === 'udp' ? UDP_Q[i] : round === 'tcp' ? TCP_Q[i] : null;
  return (
    <Device title="מסוף המשלוחים" subtitle={round.startsWith('udp') ? 'סיבוב 1 · UDP' : round === 'intro' ? 'שני סיבובים' : 'סיבוב 2 · TCP'} wide tone="rust">
      {round === 'intro' && (
        <div className="ship-intro">
          <p>הקובץ מתחלק לחלקים ממוספרים. נשלח אותם פעמיים, כל פעם בשיטה אחרת, ונראה מה קורה בדרך.</p>
          <ul>
            <li><b>סיבוב 1 (UDP):</b> {UDP_Q.length} שאלות מהירות, {UDP_SECONDS} שניות לכל אחת. עונים פעם אחת, ואין חזרה.</li>
            <li><b>סיבוב 2 (TCP):</b> {TCP_Q.length} שאלות. טעות? החלק נשלח שוב עד שהוא מגיע נכון.</li>
          </ul>
          <button type="button" className="btn" onClick={() => { setRound('udp'); setI(0); say('companion', R.lines.udpIntro); }}>מתחילים: UDP</button>
        </div>
      )}
      {round === 'udpDone' && (
        <div className="ship-intro">
          <Packets list={udpRes} />
          <p>{udpRes.filter((r) => r === 'ok').length} מתוך {UDP_Q.length} חבילות הגיעו. מה שאבד, פשוט לא הגיע. ב-UDP אף אחד לא בודק ולא שולח שוב.</p>
          <button type="button" className="btn" onClick={() => { setRound('tcp'); setI(0); say('companion', R.lines.tcpIntro); }}>לסיבוב 2: TCP</button>
        </div>
      )}
      {round === 'done' && (
        <div className="ship-intro">
          <Packets list={tcpRes} />
          <Feedback kind="ok">כל החלקים הגיעו, ובסדר הנכון. ככה TCP.</Feedback>
        </div>
      )}
      {q && (
        <div className="quiz">
          <Packets list={(round === 'udp' ? udpRes : tcpRes).map((v, j) => (j === i && !v ? 'now' : v))} />
          <div className="quiz-head">
            <span>חבילה {i + 1} מתוך {round === 'udp' ? UDP_Q.length : TCP_Q.length}</span>
            {round === 'udp' && <span className={`countdown ${left <= 3 ? 'urgent' : ''}`}>{Math.max(0, left)} שנ׳</span>}
          </div>
          <p className="quiz-q">{q.q}</p>
          <div className="quiz-answers">
            {q.a.map((a, k) => (
              <button key={k} type="button" className="answer" disabled={lock} onClick={() => (round === 'udp' ? answerUdp(k) : answerTcp(k))}>{a}</button>
            ))}
          </div>
          {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
        </div>
      )}
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'ship' ? <ShipOverlay /> : null;
}
