// "Layer 8" – the final control room twist. All seven layers are fine; the bug is a typo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, useUI, roomFlag } from '../../game/store';
import { roomByNumber, LECTURER_EMAIL, TYPO_EMAIL } from '../../game/rooms';
import { Interactable } from '../../engine/Interactable';
import { Box, Cyl, Sign, RoomShell, RoomLights } from '../../engine/kit';
import { Companion } from '../../companion/Companion';
import { LAYERS } from '../../hub/doorArt';
import { Device, Feedback } from '../../ui/Device';
import { sfx } from '../../audio/audio';

const R = roomByNumber(8);

export const standpoints = {
  center: { label: 'מרכז חדר הבקרה', pos: [0, 1.6, 2.0], look: [0, 1.7, -3.5] },
  console: { label: 'עמדת השליחה', pos: [0, 1.55, 0.3], look: [0, 1.1, -1.4] },
};

function Screens({ failed, sent }) {
  const mats = useRef([]);
  const green = useMemo(() => new THREE.Color('#65CDAA'), []);
  const amber = useMemo(() => new THREE.Color('#FFB547'), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats.current.forEach((m, i) => {
      if (!m) return;
      const glitchy = failed && !sent && Math.sin(t * 13 + i * 2.1) > 0.4;
      m.emissive.copy(glitchy ? amber : green);
      m.emissiveIntensity = sent ? 1.4 + Math.sin(t * 3 + i) * 0.3 : glitchy ? 1.4 : 0.6;
    });
  });
  return (
    <group>
      {LAYERS.map((l, i) => {
        const a = (i - 3) * 0.32;
        return (
          <group key={l.n} position={[Math.sin(a) * 3.2, 2.15, -Math.cos(a) * 3.2 + 0.2]} rotation={[0, -a, 0]}>
            <Box s={[0.86, 0.6, 0.05]} c="#120e18" m={0.5} r={0.4} />
            <mesh position={[0, -0.2, 0.03]} userData={{ noHighlight: true }}>
              <boxGeometry args={[0.7, 0.05, 0.01]} />
              <meshStandardMaterial ref={(el) => (mats.current[i] = el)} color="#000" emissive="#65CDAA" emissiveIntensity={0.6} toneMapped={false} />
            </mesh>
            <Sign p={[0, 0.05, 0.028]} s={[0.78, 0.36]} lit w={520} h={240} bg="#140f1c" pad={26} align="center" aged={false}
              lines={[{ text: `LAYER ${String(l.n).padStart(2, '0')}`, size: 50, color: '#cbb6e0', dir: 'ltr', align: 'center', font: 'Rubik' }, { text: l.en, size: 54, color: '#ffffff', dir: 'ltr', align: 'center', font: 'Rubik' }, { text: 'ONLINE', size: 40, color: '#65CDAA', dir: 'ltr', align: 'center', font: 'Rubik' }]} />
          </group>
        );
      })}
    </group>
  );
}

export function Scene() {
  const sent = useGame((s) => s.solved.includes(8));
  const failed = useGame((s) => roomFlag(s, 8, 'failed'));
  const open = useUI((s) => s.openOverlay);
  const replay = useUI((s) => s.replayBubble);
  const glitchLight = useRef();
  useFrame(({ clock }) => {
    if (glitchLight.current) glitchLight.current.intensity = failed && !sent ? (Math.sin(clock.elapsedTime * 17) > 0.3 ? 5 : 0.5) : 0;
  });
  return (
    <>
      <color attach="background" args={['#0b0811']} />
      <fog attach="fog" args={['#0b0811', 7, 16]} />
      <RoomLights fill="#d9cdee" ground="#1d1533" amount={sent ? 0.8 : 0.45} />
      <RoomShell w={7} d={7} h={3.6} wall="#2a2238" floor="#1d1828" ceil="#16121f" pilaster="#4d3f63" cove={sent ? '#d8ffef' : '#c9a8ff'} coveIntensity={sent ? 2.2 : 1.2} seed={81} />
      <pointLight position={[0, 3.2, -1]} intensity={sent ? 14 : 6} distance={10} color={sent ? '#e8fff6' : '#cdb6ff'} />
      <pointLight ref={glitchLight} position={[0, 2.4, -2.2]} intensity={0} distance={6} color="#FFB547" />
      <Screens failed={failed} sent={sent} />
      <Interactable label="עמדת השליחה – לשלוח את הקובץ" standpoint="console" onActivate={() => open('send')}>
        <group position={[0, 0, -1.3]}>
          <Cyl p={[0, 0.5, 0]} a={[0.55, 0.65, 1.0, 40]} c="#2e2640" m={0.7} r={0.35} />
          <Cyl p={[0, 1.02, 0]} a={[0.72, 0.72, 0.05, 40]} c="#cfd5db" m={0.85} r={0.25} />
          <group position={[0, 1.2, -0.2]} rotation={[-0.45, 0, 0]}>
            <Box s={[0.9, 0.5, 0.04]} c="#120e18" m={0.5} r={0.4} />
            <Sign p={[0, 0, 0.022]} s={[0.84, 0.44]} lit w={760} h={400} bg={sent ? '#0f2a22' : failed ? '#2a1d0d' : '#140f1c'} pad={36} align="center" aged={false}
              lines={sent ? [{ text: 'נשלח', size: 96, color: '#65CDAA', font: 'Rubik' }, { text: '23:59:58', size: 64, color: '#DDE8EF', dir: 'ltr', align: 'center', font: 'Rubik' }] : failed ? [{ text: 'השליחה נכשלה', size: 70, color: '#FFB547', font: 'Rubik' }, { text: 'בדקו את כתובת הנמען', size: 46, color: '#e6d6b8', gap: 10 }] : [{ text: 'הקובץ של נועה', size: 60, color: '#DDE8EF', font: 'Rubik' }, { text: 'מוכן לשליחה', size: 50, color: '#cbb6e0', gap: 12 }]} />
          </group>
        </group>
      </Interactable>
      <Companion position={[-1.5, 0, -0.6]} facing={0.4} onActivate={replay} />
    </>
  );
}

const norm = (s) => s.trim().toLowerCase();

function SendOverlay() {
  const close = useUI((s) => s.closeOverlay);
  const speak = useUI((s) => s.speak);
  const say = useUI((s) => s.say);
  const setJournalOpen = useUI((s) => s.setJournalOpen);
  const failed = useGame((s) => roomFlag(s, 8, 'failed'));
  const sent = useGame((s) => s.solved.includes(8));
  const hasCard = useGame((s) => s.journal.includes('r7-email'));
  const [to, setTo] = useState(TYPO_EMAIL);
  const [msg, setMsg] = useState(null);
  const input = useRef();
  useEffect(() => {
    if (failed) input.current?.focus();
  }, [failed]);

  const send = (e) => {
    e.preventDefault();
    if (sent) return;
    if (!failed) {
      sfx.buzz();
      useGame.getState().setRoomFlag(8, 'failed');
      speak([
        { who: 'companion', text: R.lines.fail },
        { who: 'glitch', text: R.lines.glitch },
        { who: 'companion', text: R.lines.explain },
      ]);
      setMsg({ kind: 'error', text: 'השליחה נכשלה: הכתובת לא קיימת.' });
      return;
    }
    if (norm(to) === norm(LECTURER_EMAIL)) {
      sfx.success();
      sfx.fragment();
      setMsg({ kind: 'ok', text: 'הקובץ נשלח בהצלחה – 23:59:58' });
      useGame.getState().solveRoom(8);
      setTimeout(() => say('companion', 'נשלח. שתי שניות לפני חצות.'), 600);
      setTimeout(() => {
        close();
        useUI.getState().setFading(true);
        setTimeout(() => {
          useGame.getState().completeRoom(8);
          useUI.getState().setFading(false);
        }, 700);
      }, 4200);
    } else {
      sfx.buzz();
      setMsg({ kind: 'error', text: R.lines.wrong });
    }
  };

  return (
    <Device title="שליחת הקובץ" subtitle="תיבת הדואר של נועה · 23:59" tone="violet">
      <form className="mail" onSubmit={send}>
        <div className="mail-row">
          <label htmlFor="mail-to">אל</label>
          <input id="mail-to" ref={input} dir="ltr" value={to} readOnly={!failed || sent} onChange={(e) => { setTo(e.target.value); setMsg(null); }} className={failed && !sent ? 'editable' : ''} autoComplete="off" spellCheck={false} />
        </div>
        <div className="mail-row"><span>נושא</span><b>הגשת עבודה – נועה</b></div>
        <div className="mail-row"><span>קובץ</span><b className="attach">עבודה_סופית.pdf</b></div>
        <p className="mail-body">שלום ד״ר לוי, מצורפת העבודה. תודה, נועה</p>
        {failed && !sent && (
          <p className="muted small">
            אפשר לתקן את הכתובת בשדה ״אל״.{' '}
            {hasCard ? (
              <button type="button" className="link-btn inline" onClick={() => setJournalOpen(true)}>להשוות לכרטיס הסגל ביומן</button>
            ) : (
              'הכתובת הנכונה מופיעה על כרטיס סגל הקורס בקבלה (שכבה 7).'
            )}
          </p>
        )}
        <div className="device-actions">
          <button type="submit" className="btn" disabled={sent}>{failed ? 'שליחה מחדש' : 'שליחה'}</button>
          {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
        </div>
      </form>
    </Device>
  );
}

export function Overlays() {
  const overlay = useUI((s) => s.overlay);
  return overlay === 'send' ? <SendOverlay /> : null;
}
