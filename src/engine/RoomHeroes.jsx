// One signature environmental detail per room – each one tells the layer's story.
// All decoration: not raycastable, away from the hotspots, cheap to animate.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sign } from './textures';

const NO_RAY = () => null;
function useDecor(ref) {
  useEffect(() => {
    ref.current?.traverse((o) => {
      if (o.isMesh) {
        o.raycast = NO_RAY;
        o.userData.noHighlight = true;
      }
    });
  }, [ref]);
}

/* Room 2 – Data Link: an overhead scanner gantry sweeping the sorting belt. */
export function ScannerGantry({ z = -2.75, y = 2.75, accent = '#78BCE8' }) {
  const g = useRef();
  useDecor(g);
  const head = useRef();
  const cone = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (head.current) head.current.position.x = Math.sin(t * 0.55) * 2.1;
    if (cone.current) cone.current.material.opacity = 0.09 + Math.max(0, Math.sin(t * 3.1)) * 0.05;
  });
  return (
    <group ref={g} position={[0, y, z]}>
      <mesh><boxGeometry args={[5.4, 0.12, 0.16]} /><meshStandardMaterial color="#2b3640" metalness={0.75} roughness={0.35} /></mesh>
      {[-2.75, 2.75].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}><boxGeometry args={[0.1, 0.9, 0.1]} /><meshStandardMaterial color="#2b3640" metalness={0.75} roughness={0.35} /></mesh>
      ))}
      <group ref={head}>
        <mesh position={[0, -0.12, 0]}><boxGeometry args={[0.34, 0.14, 0.24]} /><meshStandardMaterial color="#1b232b" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[0, -0.195, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.26, 0.05]} /><meshBasicMaterial color={accent} toneMapped={false} /></mesh>
        <mesh ref={cone} position={[0, -0.95, 0]}>
          <coneGeometry args={[0.55, 1.5, 24, 1, true]} />
          <meshBasicMaterial color={accent} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* Room 3 – Network: packets racing along the ceiling tray + a slow red fault beacon (R3). */
export function PacketStream({ y = 3.24, z = 1.1, w = 6.2, color = '#62D7A4', count = 5 }) {
  const g = useRef();
  useDecor(g);
  const dots = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    dots.current.forEach((m, i) => {
      if (!m) return;
      const k = ((t * 0.32 + i / count) % 1 + 1) % 1;
      m.position.x = -w / 2 + k * w;
      m.material.opacity = Math.sin(k * Math.PI) * 0.95;
    });
  });
  return (
    <group ref={g} position={[0, y, z]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => (dots.current[i] = el)}>
          <boxGeometry args={[0.16, 0.03, 0.03]} />
          <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function FaultBeacon({ position, rotation = [0, 0, 0] }) {
  const g = useRef();
  useDecor(g);
  const lamp = useRef();
  const light = useRef();
  const tex = useMemo(() => sign({ w: 256, h: 96, bg: '#2a1012', pad: 14, align: 'center', aged: false, lines: [{ text: 'R3 · FAULT', size: 40, color: '#FF6672', font: 'monospace' }] }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // low-frequency, irregular – a tired relay, never a strobe
    const on = Math.sin(t * 0.9) + Math.sin(t * 2.3) * 0.4 > 0.3;
    if (lamp.current) lamp.current.emissiveIntensity = on ? 2.6 : 0.3;
    if (light.current) light.current.intensity = on ? 1.4 : 0.1;
  });
  return (
    <group ref={g} position={position} rotation={rotation}>
      <mesh><boxGeometry args={[0.5, 0.2, 0.04]} /><meshStandardMaterial color="#1a1d21" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.021]}><planeGeometry args={[0.46, 0.17]} /><meshStandardMaterial map={tex} roughness={0.6} /></mesh>
      <mesh position={[0, 0.17, 0.03]}>
        <sphereGeometry args={[0.05, 14, 10]} />
        <meshStandardMaterial ref={lamp} color="#300" emissive="#FF4A4A" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.2, 0.25]} color="#ff4a4a" intensity={1} distance={2.2} decay={1.8} />
    </group>
  );
}

/* Room 4 – Transport: crates gliding on an overhead rail (the automated warehouse). */
export function CrateRail({ y = 3.25, z = -0.4, w = 6.4, accent = '#F0A56C' }) {
  const g = useRef();
  useDecor(g);
  const crates = useRef([]);
  const label = useMemo(() => sign({ w: 128, h: 128, bg: '#c27a3e', pad: 10, align: 'center', aged: false, lines: [{ text: 'SEG', size: 34, color: '#1c130b', font: 'monospace' }, { text: '#', size: 40, color: '#1c130b' }] }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    crates.current.forEach((c, i) => {
      if (!c) return;
      const k = ((t * 0.05 + i / 3) % 1 + 1) % 1;
      c.position.x = -w / 2 + k * w;
      c.rotation.z = Math.sin(t * 1.3 + i) * 0.03; // a little sway
    });
  });
  return (
    <group ref={g} position={[0, y, z]}>
      <mesh><boxGeometry args={[w + 0.4, 0.08, 0.1]} /><meshStandardMaterial color="#3a3530" metalness={0.75} roughness={0.35} /></mesh>
      <mesh position={[0, -0.05, 0]}><boxGeometry args={[w + 0.4, 0.015, 0.02]} /><meshStandardMaterial color="#000" emissive={accent} emissiveIntensity={0.8} toneMapped={false} /></mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => (crates.current[i] = el)}>
          <mesh position={[0, -0.22, 0]}><boxGeometry args={[0.02, 0.36, 0.02]} /><meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, -0.6, 0]}><boxGeometry args={[0.46, 0.4, 0.4]} /><meshStandardMaterial color="#6b5440" metalness={0.2} roughness={0.75} /></mesh>
          <mesh position={[0, -0.6, 0.201]}><planeGeometry args={[0.26, 0.26]} /><meshStandardMaterial map={label} roughness={0.7} /></mesh>
        </group>
      ))}
    </group>
  );
}

/* Room 6 – Presentation: slow holographic rings – data being transformed. */
export function HoloRings({ position = [0, 2.75, 0.2], accent = '#B49AFF', second = '#78C9E8' }) {
  const g = useRef();
  useDecor(g);
  const a = useRef();
  const b = useRef();
  const c = useRef();
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (a.current) { a.current.rotation.x += dt * 0.25; a.current.rotation.y += dt * 0.15; }
    if (b.current) { b.current.rotation.y -= dt * 0.35; b.current.rotation.z += dt * 0.1; }
    if (c.current) c.current.position.y = Math.sin(t * 1.4) * 0.04;
  });
  const mat = (col, o) => <meshBasicMaterial color={col} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />;
  return (
    <group ref={g} position={position}>
      <mesh ref={a}><torusGeometry args={[0.55, 0.006, 6, 96]} />{mat(accent, 0.8)}</mesh>
      <mesh ref={b} rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[0.42, 0.005, 6, 96]} />{mat(second, 0.7)}</mesh>
      <mesh ref={c}><octahedronGeometry args={[0.09, 0]} />{mat(accent, 0.9)}</mesh>
    </group>
  );
}

/* Room 7 – Application: a warm service strip along the reception counter. */
export function CounterGlow({ z = -2.09, y = 1.05, w = 6.2, accent = '#E7C16D', solved }) {
  const g = useRef();
  useDecor(g);
  const m = useRef();
  useFrame(({ clock }) => {
    if (m.current) m.current.emissiveIntensity = solved ? 1.6 : 0.9 + Math.sin(clock.elapsedTime * 2.2) * 0.08;
  });
  return (
    <group ref={g}>
      <mesh position={[0, y, z]}>
        <boxGeometry args={[w, 0.02, 0.02]} />
        <meshStandardMaterial ref={m} color="#000" emissive={accent} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.5, z + 0.6]} color={accent} intensity={1.6} distance={3} decay={1.8} />
    </group>
  );
}

/* Room 8 – Control: two command displays – layer status and the transmit link. */
export function CommandDisplays({ sent }) {
  const g = useRef();
  useDecor(g);
  const bars = useRef([]);
  const wave = useRef([]);
  const tx = useRef();
  const head = useMemo(
    () => ({
      layers: sign({ w: 512, h: 64, bg: '#0a1218', pad: 10, align: 'center', aged: false, lines: [{ text: 'LAYER STATUS · 7/7', size: 34, color: '#79DDE5', font: 'monospace' }] }),
      link: sign({ w: 512, h: 64, bg: '#0a1218', pad: 10, align: 'center', aged: false, lines: [{ text: 'TX LINK · OUTBOUND', size: 34, color: '#79DDE5', font: 'monospace' }] }),
    }),
    [],
  );
  const amber = useMemo(() => new THREE.Color('#FFB85C'), []);
  const teal = useMemo(() => new THREE.Color('#69D6B2'), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    bars.current.forEach((m, i) => m && (m.scale.y = 0.85 + Math.sin(t * 2 + i) * 0.05));
    wave.current.forEach((m, i) => {
      if (!m) return;
      const amp = sent ? 0.9 : 0.35;
      m.scale.y = 0.15 + amp * Math.abs(Math.sin(t * (sent ? 5 : 2.2) + i * 0.55));
      m.material.color.copy(sent ? teal : amber);
    });
    if (tx.current) tx.current.material.opacity = sent ? 1 : 0.4 + Math.max(0, Math.sin(t * 2.4)) * 0.6;
  });
  return (
    <group ref={g}>
      {[-2.25, 2.25].map((x, side) => (
        <group key={x} position={[x, 2.05, -3.42]}>
          <mesh><boxGeometry args={[1.7, 1.05, 0.06]} /><meshStandardMaterial color="#141a22" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 0, 0.031]}><planeGeometry args={[1.6, 0.95]} /><meshStandardMaterial color="#03070a" roughness={0.18} metalness={0.15} /></mesh>
          <mesh position={[0, 0.39, 0.033]}><planeGeometry args={[1.5, 0.14]} /><meshBasicMaterial map={side ? head.link : head.layers} toneMapped={false} /></mesh>
          {side === 0
            ? Array.from({ length: 7 }, (_, i) => (
                <group key={i} position={[-0.6 + i * 0.2, -0.38, 0.034]}>
                  <mesh ref={(el) => (bars.current[i] = el)} position={[0, 0.3, 0]}>
                    <planeGeometry args={[0.12, 0.6]} />
                    <meshBasicMaterial color="#69D6B2" toneMapped={false} />
                  </mesh>
                </group>
              ))
            : (
              <>
                {Array.from({ length: 24 }, (_, i) => (
                  <mesh key={i} ref={(el) => (wave.current[i] = el)} position={[-0.69 + i * 0.06, -0.02, 0.034]}>
                    <planeGeometry args={[0.035, 0.5]} />
                    <meshBasicMaterial color="#FFB85C" toneMapped={false} />
                  </mesh>
                ))}
                <mesh ref={tx} position={[0, -0.36, 0.034]}>
                  <planeGeometry args={[0.5, 0.06]} />
                  <meshBasicMaterial color={sent ? '#69D6B2' : '#FFB85C'} transparent toneMapped={false} />
                </mesh>
              </>
            )}
        </group>
      ))}
    </group>
  );
}
