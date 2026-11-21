// Small building blocks for dressing rooms, so each scene reads as a layout
// of real objects rather than a pile of geometry boilerplate.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { panels, tiles, metal, sign, hazard } from './textures';
import { Interactable } from './Interactable';
import { Dust } from './Atmosphere';

export function Mat({ c = '#808890', m = 0.4, r = 0.55, map = null, e, ei = 1, side, transparent, opacity, matRef, nmap, ns = 0.6 }) {
  return (
    <meshStandardMaterial
      ref={matRef}
      color={c}
      metalness={m}
      roughness={r}
      map={map}
      normalMap={nmap || null}
      normalScale={[ns, ns]}
      emissive={e || '#000000'}
      emissiveIntensity={e ? ei : 0}
      toneMapped={!e}
      side={side}
      transparent={transparent}
      opacity={opacity}
    />
  );
}

export function Box({ p = [0, 0, 0], s = [1, 1, 1], rot, meshRef, noHighlight, ...mat }) {
  return (
    <mesh ref={meshRef} position={p} rotation={rot} userData={noHighlight ? { noHighlight: true } : undefined}>
      <boxGeometry args={s} />
      <Mat {...mat} />
    </mesh>
  );
}

export function Cyl({ p = [0, 0, 0], a = [0.5, 0.5, 1, 24], rot, meshRef, noHighlight, ...mat }) {
  return (
    <mesh ref={meshRef} position={p} rotation={rot} userData={noHighlight ? { noHighlight: true } : undefined}>
      <cylinderGeometry args={a} />
      <Mat {...mat} />
    </mesh>
  );
}

/** A flat panel; `basic` renders it unlit (for screens). */
export function Pl({ p = [0, 0, 0], s = [1, 1], rot, map, basic, c = '#ffffff', noHighlight, ...mat }) {
  return (
    <mesh position={p} rotation={rot} userData={noHighlight || basic ? { noHighlight: true } : undefined}>
      <planeGeometry args={s} />
      {basic ? <meshBasicMaterial map={map} color={c} toneMapped={false} /> : <Mat map={map} c={c} {...mat} />}
    </mesh>
  );
}

/** A sign / screen with Hebrew text. */
export function Sign({ p, rot, s = [1, 0.3], lit, ...opts }) {
  const tex = useMemo(() => sign(opts), [JSON.stringify(opts)]);
  return <Pl p={p} rot={rot} s={s} map={tex} basic={lit} r={0.6} />;
}

/**
 * Room shell with architectural depth: panelled walls, pilasters, a cove of
 * soft light under the ceiling, ceiling beams, skirting, and an opening in the
 * south wall for the exit door (which every room has).
 */
export function RoomShell({
  w = 7,
  d = 7,
  h = 3.6,
  wall = '#4b5560',
  floor = '#2b2f34',
  ceil = '#202428',
  trim = '#25292e',
  pilaster = '#3a4048',
  cove = '#ffe7c7',
  coveIntensity = 1.4,
  panelCols = 2,
  panelRows = 3,
  floorTiles = 6,
  seed = 1,
}) {
  const t = useMemo(
    () => ({
      wallNS: panels(wall, seed, { cols: panelCols, rows: panelRows, repeat: [w / 2.4, h / 3] }),
      wallEW: panels(wall, seed + 1, { cols: panelCols, rows: panelRows, repeat: [d / 2.4, h / 3] }),
      side: panels(wall, seed + 2, { cols: panelCols, rows: panelRows, repeat: [(w / 2 - 0.75) / 2.4, h / 3] }),
      top: panels(wall, seed + 3, { cols: 1, rows: 1, repeat: [0.6, (h - 2.4) / 3] }),
      floor: tiles(floor, seed + 4, { n: 4, repeat: [w / floorTiles * 1.5, d / floorTiles * 1.5] }),
      ceil: panels(ceil, seed + 5, { cols: 3, rows: 3, repeat: [w / 3, d / 3], grime: 0.2 }),
      trim: metal(trim, seed + 6, [4, 1]),
    }),
    [wall, floor, ceil, trim, w, d, h, seed, panelCols, panelRows, floorTiles],
  );
  const W = w / 2, D = d / 2;
  const sideW = W - 0.75;
  const pil = (x, z, ry) => (
    <group key={`${x}-${z}`} position={[x, h / 2, z]} rotation={[0, ry, 0]}>
      <Box s={[0.34, h, 0.16]} c={pilaster} m={0.6} r={0.45} />
      <Box p={[0, -h / 2 + 0.6, 0.085]} s={[0.22, 0.02, 0.01]} c="#000" e={cove} ei={0.5} noHighlight />
    </group>
  );
  const pilasters = [];
  for (let x = -W + 1.6; x < W - 0.8; x += 2.2) pilasters.push(pil(x, -D + 0.08, 0));
  for (let z = -D + 1.6; z < D - 0.8; z += 2.2) {
    pilasters.push(pil(-W + 0.08, z, Math.PI / 2));
    pilasters.push(pil(W - 0.08, z, -Math.PI / 2));
  }
  const coveStrip = (p, s) => (
    <group key={p.join(',')}>
      <Box p={p} s={s} c={trim} m={0.5} r={0.5} />
      <Box p={[p[0], p[1] - 0.06, p[2]]} s={[s[0] * 0.98, 0.015, s[2] * 0.98]} c="#000" e={cove} ei={coveIntensity * 0.7} noHighlight />
    </group>
  );
  return (
    <group>
      <Pl p={[0, h / 2, -D]} s={[w, h]} map={t.wallNS} r={0.75} m={0.3} />
      <Pl p={[-W, h / 2, 0]} s={[d, h]} rot={[0, Math.PI / 2, 0]} map={t.wallEW} r={0.75} m={0.3} />
      <Pl p={[W, h / 2, 0]} s={[d, h]} rot={[0, -Math.PI / 2, 0]} map={t.wallEW} r={0.75} m={0.3} />
      {/* south wall around the exit opening (x -0.75…0.75, height 2.4) */}
      <Pl p={[-W + sideW / 2, h / 2, D]} s={[sideW, h]} rot={[0, Math.PI, 0]} map={t.side} r={0.75} m={0.3} />
      <Pl p={[W - sideW / 2, h / 2, D]} s={[sideW, h]} rot={[0, Math.PI, 0]} map={t.side} r={0.75} m={0.3} />
      <Pl p={[0, (h + 2.4) / 2, D]} s={[1.5, h - 2.4]} rot={[0, Math.PI, 0]} map={t.top} r={0.75} m={0.3} />
      <Pl p={[0, 0, 0]} s={[w, d]} rot={[-Math.PI / 2, 0, 0]} map={t.floor} r={0.38} m={0.25} />
      <Pl p={[0, h, 0]} s={[w, d]} rot={[Math.PI / 2, 0, 0]} map={t.ceil} r={0.9} />
      {pilasters}
      {/* light cove along the top of each wall */}
      {coveStrip([0, h - 0.22, -D + 0.12], [w, 0.1, 0.22])}
      {coveStrip([-W + 0.12, h - 0.22, 0], [0.22, 0.1, d])}
      {coveStrip([W - 0.12, h - 0.22, 0], [0.22, 0.1, d])}
      {coveStrip([0, h - 0.22, D - 0.12], [w, 0.1, 0.22])}
      {/* ceiling beams */}
      {[-d / 4, d / 4].map((z) => (
        <Box key={z} p={[0, h - 0.14, z]} s={[w, 0.28, 0.24]} map={t.trim} c="#9aa3ab" m={0.5} r={0.5} />
      ))}
      {/* skirting */}
      <Box p={[0, 0.06, -D + 0.02]} s={[w, 0.12, 0.04]} map={t.trim} m={0.6} r={0.45} />
      <Box p={[-W + 0.02, 0.06, 0]} s={[0.04, 0.12, d]} map={t.trim} m={0.6} r={0.45} />
      <Box p={[W - 0.02, 0.06, 0]} s={[0.04, 0.12, d]} map={t.trim} m={0.6} r={0.45} />
      {/* drifting dust in the light */}
      <Dust w={w - 0.6} d={d - 0.6} h={h} color={cove} size={2.2} count={Math.round(w * d * 5)} />
    </group>
  );
}

/**
 * The room's exit, centred in the south wall. Two leaves slide apart when `open`.
 * A status light shows red (locked) or green (open). Behind it: a lit corridor.
 */
export function ExitDoor({ d = 7, open, onActivate, accent = '#3FD0E0' }) {
  const D = d / 2;
  const left = useRef();
  const right = useRef();
  const lamp = useRef();
  const leaf = useMemo(() => metal('#59636d', 77), []);
  const haz = useMemo(() => hazard([2, 1]), []);
  const red = useMemo(() => new THREE.Color('#EF6D73'), []);
  const green = useMemo(() => new THREE.Color('#65CDAA'), []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 2.5);
    if (left.current) left.current.position.x += ((open ? -1.12 : -0.36) - left.current.position.x) * k;
    if (right.current) right.current.position.x += ((open ? 1.12 : 0.36) - right.current.position.x) * k;
    if (lamp.current) lamp.current.emissive.copy(open ? green : red);
  });
  return (
    <group position={[0, 0, D]} rotation={[0, Math.PI, 0]}>
      <Interactable label={open ? 'חזרה לאולם הליבה' : 'דלת היציאה: נעולה'} onActivate={onActivate}>
        <Box p={[-0.8, 1.22, 0.04]} s={[0.12, 2.44, 0.18]} c="#2a2f35" m={0.7} r={0.35} />
        <Box p={[0.8, 1.22, 0.04]} s={[0.12, 2.44, 0.18]} c="#2a2f35" m={0.7} r={0.35} />
        <Box p={[0, 2.46, 0.04]} s={[1.72, 0.12, 0.18]} c="#2a2f35" m={0.7} r={0.35} />
        <Pl p={[0, 2.46, 0.135]} s={[1.6, 0.06]} map={haz} r={0.7} />
        <group ref={left} position={[-0.36, 1.2, -0.02]}>
          <Box s={[0.74, 2.38, 0.05]} map={leaf} m={0.6} r={0.4} />
          <Box p={[0.3, 0, 0.03]} s={[0.03, 0.5, 0.02]} c="#15181b" m={0.8} r={0.3} />
        </group>
        <group ref={right} position={[0.36, 1.2, -0.02]}>
          <Box s={[0.74, 2.38, 0.05]} map={leaf} m={0.6} r={0.4} />
          <Box p={[-0.3, 0, 0.03]} s={[0.03, 0.5, 0.02]} c="#15181b" m={0.8} r={0.3} />
        </group>
        <mesh position={[0, 2.66, 0.1]} userData={{ noHighlight: true }}>
          <sphereGeometry args={[0.05, 14, 10]} />
          <meshStandardMaterial ref={lamp} color="#222" emissive="#EF6D73" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </Interactable>
      {/* corridor glow beyond */}
      <Box p={[0, 1.2, -1.2]} s={[1.6, 2.4, 0.05]} c="#0b1016" e={accent} ei={open ? 0.35 : 0.05} noHighlight />
      <Box p={[-0.78, 1.2, -0.6]} s={[0.05, 2.4, 1.2]} c="#1a2026" m={0.5} r={0.5} />
      <Box p={[0.78, 1.2, -0.6]} s={[0.05, 2.4, 1.2]} c="#1a2026" m={0.5} r={0.5} />
    </group>
  );
}

/** A soft rectangular light panel (a "real" fixture, not a neon line). */
export function LightPanel({ p, s = [0.8, 0.04, 0.8], color = '#fff1dd', intensity = 1.2, light = 6, distance = 7 }) {
  return (
    <group position={p}>
      <Box s={[s[0] + 0.06, s[1], s[2] + 0.06]} c="#2a2e33" m={0.6} r={0.4} />
      <Box p={[0, -0.022, 0]} s={[s[0], 0.01, s[2]]} c="#000" e={color} ei={intensity} noHighlight />
      <pointLight position={[0, -0.3, 0]} color={color} intensity={light} distance={distance} decay={1.6} />
    </group>
  );
}

/** Rack of blinking status LEDs. */
export function Leds({ p, rot, rows = 4, cols = 6, gap = 0.05, bad = [], ok = true }) {
  const refs = useRef([]);
  const seeds = useMemo(() => Array.from({ length: rows * cols }, () => Math.random() * 10), [rows, cols]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const isBad = bad.includes(i) && !ok;
      m.emissiveIntensity = isBad ? (Math.sin(t * 8) > 0 ? 3 : 0.2) : Math.sin(t * (2 + (seeds[i] % 3)) + seeds[i]) > -0.2 ? 2 : 0.3;
    });
  });
  return (
    <group position={p} rotation={rot}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <mesh key={i} position={[(i % cols) * gap - ((cols - 1) * gap) / 2, Math.floor(i / cols) * gap - ((rows - 1) * gap) / 2, 0]} userData={{ noHighlight: true }}>
          <boxGeometry args={[0.018, 0.012, 0.01]} />
          <meshStandardMaterial ref={(el) => (refs.current[i] = el)} color="#111" emissive={bad.includes(i) && !ok ? '#EF6D73' : '#65CDAA'} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Lighting rig shared by rooms: soft fill + room-tinted bounce. */
export function RoomLights({ fill = '#d9e2ea', ground = '#2a2622', amount = 0.6, solved }) {
  return (
    <>
      <ambientLight intensity={amount * (solved ? 1.2 : 1)} color={fill} />
      <hemisphereLight args={[fill, ground, amount * 0.9]} />
    </>
  );
}

/** Animated value 0→1 that follows a boolean, for "the room comes alive" effects. */
export function useEase(target, speed = 1) {
  const v = useRef(target ? 1 : 0);
  useFrame((_, dt) => {
    v.current += ((target ? 1 : 0) - v.current) * Math.min(1, dt * speed);
  });
  return v;
}
