import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, useUI } from '../game/store';
import { HUB_TEXT } from '../game/rooms';
import { Interactable } from '../engine/Interactable';
import { Box, Cyl, Pl } from '../engine/kit';
import { panels, metal, tiles } from '../engine/textures';
import { Companion } from '../companion/Companion';
import { sfx } from '../audio/audio';
import { LAYERS, doorTexture, leafTextures, statusBandTexture } from './doorArt';

export const HALL_R = 7.4;
const DOOR_R = 7.0;
const H = 5.4;

/** Angle of door n around the hall (door 1 straight ahead, then clockwise). */
export const doorAngle = (n) => ((n - 1) * Math.PI * 2) / 7;
export const doorPos = (n, r = DOOR_R, y = 1.6) => [Math.sin(doorAngle(n)) * r, y, -Math.cos(doorAngle(n)) * r];

export const HUB_STANDPOINTS = {
  center: { label: 'מרכז האולם', pos: [0, 1.65, 0], look: doorPos(1) },
  ...Object.fromEntries(LAYERS.map((l) => [`door${l.n}`, { label: `דלת ${l.n}`, pos: doorPos(l.n, 4.2, 1.65), look: doorPos(l.n, DOOR_R, 1.55) }])),
};

/* ------------------------------------------------------------------ */

function doorState(n, solved) {
  if (solved.includes(n)) return 'done';
  if (useGame.getState().adminFree) return 'active';
  const next = [1, 2, 3, 4, 5, 6, 7].find((k) => !solved.includes(k));
  return n === next ? 'active' : 'locked';
}

/** Small physical hint next to each door, so no two portals look alike. */
function DoorProp({ n, accent }) {
  const wheel = useRef();
  useFrame((_, dt) => {
    if (wheel.current) wheel.current.rotation.z += dt * 0.15;
  });
  const side = 1.55;
  switch (n) {
    case 1:
      return (
        <group position={[side, 0, 0.1]}>
          <Box p={[0, 1.3, 0]} s={[0.36, 0.5, 0.18]} c="#5a4636" m={0.6} r={0.4} />
          {[-0.1, 0, 0.1].map((x, i) => (
            <Cyl key={i} p={[x, 0.53, 0.02]} a={[0.025, 0.025, 1.06, 10]} c={['#a8673a', '#2b2b2b', '#7a2b2b'][i]} m={0.6} r={0.4} />
          ))}
          <Box p={[0, 1.38, 0.1]} s={[0.12, 0.12, 0.02]} c="#111" e={accent} ei={0.8} noHighlight />
        </group>
      );
    case 2:
      return (
        <group position={[side, 1.1, 0.06]}>
          {Array.from({ length: 12 }, (_, i) => (
            <Box key={i} p={[((i % 3) - 1) * 0.17, Math.floor(i / 3) * 0.16, 0]} s={[0.15, 0.13, 0.14]} c="#4f5f70" m={0.6} r={0.45} />
          ))}
        </group>
      );
    case 3:
      return (
        <group position={[side, 1.5, 0.05]}>
          <Box s={[0.5, 0.36, 0.06]} c="#1b2420" m={0.5} r={0.4} />
          {[[-0.15, 0.08], [0.05, 0.1], [0.16, -0.06], [-0.05, -0.08]].map(([x, y], i) => (
            <Box key={i} p={[x, y, 0.035]} s={[0.035, 0.035, 0.01]} c="#000" e={accent} ei={1.6} noHighlight />
          ))}
        </group>
      );
    case 4:
      return (
        <group position={[0, 0.08, 0.55]}>
          <Box s={[1.9, 0.06, 0.5]} c="#2e3338" m={0.6} r={0.4} />
          {Array.from({ length: 8 }, (_, i) => (
            <Cyl key={i} p={[-0.84 + i * 0.24, 0.05, 0]} a={[0.04, 0.04, 0.46, 12]} rot={[Math.PI / 2, 0, 0]} c="#9aa3ab" m={0.8} r={0.3} />
          ))}
        </group>
      );
    case 5:
      return (
        <group position={[side, 1.3, 0.06]}>
          <Box s={[0.42, 0.62, 0.06]} c="#3b2c24" m={0.4} r={0.6} />
          {Array.from({ length: 12 }, (_, i) => (
            <Cyl key={i} p={[((i % 3) - 1) * 0.12, Math.floor(i / 3) * 0.13 - 0.2, 0.035]} a={[0.02, 0.02, 0.02, 10]} rot={[Math.PI / 2, 0, 0]} c="#c08a62" m={0.8} r={0.3} />
          ))}
        </group>
      );
    case 6:
      return (
        <group position={[side, 1.55, 0.08]}>
          <group ref={wheel}>
            <Cyl a={[0.26, 0.26, 0.04, 40]} rot={[Math.PI / 2, 0, 0]} c="#3a2f44" m={0.7} r={0.35} />
            <Cyl p={[0, 0, 0.025]} a={[0.17, 0.17, 0.02, 40]} rot={[Math.PI / 2, 0, 0]} c="#6d5a80" m={0.7} r={0.35} />
            {Array.from({ length: 8 }, (_, i) => (
              <Box key={i} p={[Math.cos((i / 8) * Math.PI * 2) * 0.21, Math.sin((i / 8) * Math.PI * 2) * 0.21, 0.03]} s={[0.03, 0.03, 0.01]} c="#000" e={accent} ei={1} noHighlight />
            ))}
          </group>
        </group>
      );
    case 7:
      return (
        <group position={[side + 0.1, 0, 0.35]}>
          <Box p={[0, 0.5, 0]} s={[0.3, 1.0, 0.3]} c="#3a3f45" m={0.6} r={0.4} />
          <Box p={[0, 1.1, 0.04]} s={[0.4, 0.3, 0.05]} rot={[-0.35, 0, 0]} c="#1a1e22" m={0.5} r={0.4} />
          <Box p={[0, 1.1, 0.07]} s={[0.34, 0.24, 0.01]} rot={[-0.35, 0, 0]} c="#000" e={accent} ei={0.5} noHighlight />
        </group>
      );
    default:
      return null;
  }
}

function Door({ layer, state, opening, unlocking, onClick }) {
  const tex = useMemo(() => doorTexture(layer, state), [layer, state]);
  const [lTex, rTex] = useMemo(() => leafTextures(tex), [tex]);
  const left = useRef();
  const right = useRef();
  const strips = useRef([]);
  const flash = useRef(0);
  const metalTex = useMemo(() => metal('#2b3036', 90 + layer.n, [1, 2]), [layer.n]);
  const stateColor = state === 'done' ? '#65CDAA' : state === 'active' ? '#3FD0E0' : '#FFB547';
  useEffect(() => {
    if (unlocking) flash.current = 1;
  }, [unlocking]);
  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 2.2);
    const o = opening ? 1 : 0;
    if (left.current) left.current.position.x += (-0.475 - o * 0.95 - left.current.position.x) * k;
    if (right.current) right.current.position.x += (0.475 + o * 0.95 - right.current.position.x) * k;
    flash.current = Math.max(0, flash.current - dt * 0.5);
    const pulse = state === 'active' ? 0.9 + Math.sin(clock.elapsedTime * 2.4) * 0.35 : state === 'done' ? 0.9 : 0.25;
    strips.current.forEach((m) => {
      if (m) m.emissiveIntensity = pulse + flash.current * 3;
    });
  });
  const a = doorAngle(layer.n);
  return (
    <group position={[Math.sin(a) * DOOR_R, 0, -Math.cos(a) * DOOR_R]} rotation={[0, -a, 0]}>
      <Interactable label={state === 'active' ? `LAYER ${String(layer.n).padStart(2, '0')} – ${layer.en} · כניסה` : `LAYER ${String(layer.n).padStart(2, '0')} – ${layer.en}`} onActivate={onClick}>
        {/* deep portal */}
        <Box p={[-1.15, 1.75, 0.1]} s={[0.36, 3.5, 0.7]} map={metalTex} c="#9aa3ab" m={0.75} r={0.35} />
        <Box p={[1.15, 1.75, 0.1]} s={[0.36, 3.5, 0.7]} map={metalTex} c="#9aa3ab" m={0.75} r={0.35} />
        <Box p={[0, 3.62, 0.1]} s={[2.66, 0.36, 0.7]} map={metalTex} c="#9aa3ab" m={0.75} r={0.35} />
        <Box p={[0, 0.02, 0.1]} s={[2.3, 0.04, 0.7]} c="#1c1f23" m={0.7} r={0.3} />
        {/* accent chamfers – the only lit lines, and they speak: amber locked, turquoise open, green fixed */}
        {[-0.965, 0.965].map((x, i) => (
          <mesh key={x} position={[x, 1.75, 0.46]} userData={{ noHighlight: true }}>
            <boxGeometry args={[0.025, 3.3, 0.02]} />
            <meshStandardMaterial ref={(el) => (strips.current[i] = el)} color="#000" emissive={stateColor} emissiveIntensity={1} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 3.44, 0.46]} userData={{ noHighlight: true }}>
          <boxGeometry args={[1.95, 0.025, 0.02]} />
          <meshStandardMaterial ref={(el) => (strips.current[2] = el)} color="#000" emissive={stateColor} emissiveIntensity={1} toneMapped={false} />
        </mesh>
        {/* leaves */}
        <group position={[0, 1.72, 0]}>
          <mesh ref={left} position={[-0.475, 0, 0]}>
            <boxGeometry args={[0.95, 3.36, 0.06]} />
            <meshStandardMaterial attach="material-0" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-1" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-2" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-3" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-4" map={lTex} metalness={0.45} roughness={0.45} />
            <meshStandardMaterial attach="material-5" color="#23272c" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh ref={right} position={[0.475, 0, 0]}>
            <boxGeometry args={[0.95, 3.36, 0.06]} />
            <meshStandardMaterial attach="material-0" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-1" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-2" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-3" color="#23272c" metalness={0.7} roughness={0.4} />
            <meshStandardMaterial attach="material-4" map={rTex} metalness={0.45} roughness={0.45} />
            <meshStandardMaterial attach="material-5" color="#23272c" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
        {/* the passage behind, glowing in the layer's colour once open */}
        <Box p={[0, 1.72, -0.3]} s={[1.9, 3.36, 0.04]} c="#0a0d10" e={layer.accent} ei={state === 'locked' ? 0.04 : 0.35} noHighlight />
        {/* lintel lamp */}
        <Box p={[0, 3.95, 0.35]} s={[0.6, 0.06, 0.12]} c="#1a1d20" m={0.7} r={0.3} />
        <Box p={[0, 3.915, 0.35]} s={[0.56, 0.01, 0.1]} c="#000" e={state === 'locked' ? '#6b5a3e' : '#fff0d8'} ei={state === 'locked' ? 0.4 : 1.6} noHighlight />
      </Interactable>
      <DoorProp n={layer.n} accent={layer.accent} />
      <pointLight position={[0, 3.4, 1.3]} intensity={state === 'locked' ? 2.5 : 7} distance={4.5} decay={1.6} color={state === 'locked' ? '#d6c7ad' : '#fff1de'} />
    </group>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A walkway from the central platform to every door, with a lit inlay that tells
 * the door's state at a glance: dim amber locked, pulsing turquoise next, green fixed.
 */
function FloorPaths({ solved }) {
  const inlays = useRef([]);
  const colors = useMemo(() => ({ locked: new THREE.Color('#6b5530'), active: new THREE.Color('#3FD0E0'), done: new THREE.Color('#65CDAA') }), []);
  useFrame(({ clock }) => {
    inlays.current.forEach((m, i) => {
      if (!m) return;
      const st = doorState(i + 1, solved);
      m.emissive.copy(colors[st]);
      m.emissiveIntensity = st === 'active' ? 1.0 + Math.sin(clock.elapsedTime * 2.4 - i) * 0.45 : st === 'done' ? 0.9 : 0.35;
    });
  });
  const start = 2.15, end = DOOR_R - 0.55, len = end - start;
  return (
    <group>
      {LAYERS.map((l, i) => (
        <group key={l.n} rotation={[0, -doorAngle(l.n), 0]}>
          <Box p={[0, 0.012, -(start + len / 2)]} s={[1.0, 0.024, len]} c="#3a3f45" m={0.55} r={0.35} noHighlight />
          <Box p={[-0.52, 0.016, -(start + len / 2)]} s={[0.04, 0.03, len]} c="#9aa3ab" m={0.85} r={0.25} noHighlight />
          <Box p={[0.52, 0.016, -(start + len / 2)]} s={[0.04, 0.03, len]} c="#9aa3ab" m={0.85} r={0.25} noHighlight />
          <mesh position={[0, 0.026, -(start + len / 2)]} userData={{ noHighlight: true }}>
            <boxGeometry args={[0.08, 0.004, len - 0.2]} />
            <meshStandardMaterial ref={(el) => (inlays.current[i] = el)} color="#000" emissive="#6b5530" emissiveIntensity={0.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* the round platform the player stands on */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
        <ringGeometry args={[2.0, 2.15, 72]} />
        <meshStandardMaterial color="#9aa3ab" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Hall({ solvedCount, solved }) {
  const t = useMemo(
    () => ({
      wall: panels('#3d444c', 31, { cols: 1, rows: 4, repeat: [14, 1.2], grime: 0.2 }),
      floor: (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 1024;
        const g = c.getContext('2d');
        // plain polished stone, darker toward the walls – the paths are real geometry on top
        g.drawImage(tiles('#2b2e33', 32, { n: 10, seam: 'rgba(0,0,0,0.35)' }).image, 0, 0, 1024, 1024);
        const v = g.createRadialGradient(512, 512, 120, 512, 512, 512);
        v.addColorStop(0, 'rgba(255,255,255,0.05)');
        v.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = v;
        g.fillRect(0, 0, 1024, 1024);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
      })(),
      ceil: panels('#22262b', 33, { cols: 2, rows: 2, repeat: [8, 8], grime: 0.1 }),
      column: metal('#8f99a3', 34, [1, 4]),
    }),
    [],
  );
  const glow = 0.5 + solvedCount * 0.12;
  return (
    <group>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[HALL_R, HALL_R, H, 70, 1, true]} />
        <meshStandardMaterial map={t.wall} side={THREE.BackSide} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[HALL_R, 70]} />
        <meshStandardMaterial map={t.floor} metalness={0.35} roughness={0.32} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[HALL_R, 70]} />
        <meshStandardMaterial map={t.ceil} roughness={0.9} />
      </mesh>
      {/* ceiling: seven ribs (one above each column) meeting a round skylight over the core */}
      {Array.from({ length: 7 }, (_, i) => {
        const a = doorAngle(i + 1) + Math.PI / 7;
        const len = HALL_R - 2.0;
        const mid = 2.0 + len / 2;
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <Box p={[0, H - 0.18, -mid]} s={[0.32, 0.36, len]} c="#3a4047" m={0.6} r={0.45} />
            <Box p={[0, H - 0.365, -mid]} s={[0.06, 0.01, len - 0.4]} c="#000" e="#ffe3bd" ei={0.25 + solvedCount * 0.12} noHighlight />
          </group>
        );
      })}
      <mesh position={[0, H - 0.35, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.7, 64, 1, true]} />
        <meshStandardMaterial color="#9aa3ab" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H - 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
        <ringGeometry args={[1.86, 2.0, 64]} />
        <meshStandardMaterial color="#000" emissive="#fff1dc" emissiveIntensity={0.5 + solvedCount * 0.15} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
        <circleGeometry args={[2.0, 64]} />
        <meshStandardMaterial color="#0a1018" emissive="#9db7d6" emissiveIntensity={0.18 + solvedCount * 0.06} toneMapped={false} />
      </mesh>
      {/* columns between doors, with a warm recessed light */}
      {Array.from({ length: 7 }, (_, i) => {
        const a = doorAngle(i + 1) + Math.PI / 7;
        const lit = i < solvedCount;
        return (
          <group key={i} position={[Math.sin(a) * (HALL_R - 0.25), 0, -Math.cos(a) * (HALL_R - 0.25)]} rotation={[0, -a, 0]}>
            <Box p={[0, H / 2, 0]} s={[0.5, H, 0.4]} map={t.column} c="#b9c1c8" m={0.85} r={0.3} />
            <Box p={[0, H / 2, 0.205]} s={[0.07, H - 1.2, 0.01]} c="#000" e="#ffe3bd" ei={0.35 + (lit ? 1.1 : 0)} noHighlight />
            <Box p={[0, 2.4, 0.33]} s={[0.9, 0.55, 0.06]} c="#1a1e22" m={0.5} r={0.4} />
            <Box p={[0, 2.4, 0.365]} s={[0.82, 0.47, 0.01]} c="#000" e={lit ? '#65CDAA' : '#3a4048'} ei={lit ? 0.35 : 0.15} noHighlight />
            <Cyl p={[-0.4, 4.6, 0.2]} a={[0.04, 0.04, 1.6, 10]} rot={[0, 0, Math.PI / 2]} c="#59626a" m={0.7} r={0.4} />
          </group>
        );
      })}
      <FloorPaths solved={solved} />
      <ambientLight intensity={glow} color="#cdd8e2" />
      <hemisphereLight args={['#dfe7ee', '#2a2622', 0.35 + solvedCount * 0.06]} />
      <pointLight position={[0, H - 0.6, 0]} intensity={8 + solvedCount * 2} distance={14} decay={1.4} color="#fff1dc" />
    </group>
  );
}

/** The control core the player stands in: a waist-high ring console and the stuck file floating above. */
function Core({ solved, onActivate, celebrate }) {
  const file = useRef();
  const band = useRef();
  const slabs = useRef([]);
  const bandTex = useMemo(() => statusBandTexture(solved), [solved]);
  const fixedCol = useMemo(() => new THREE.Color('#9ff0d6'), []);
  const stuckCol = useMemo(() => new THREE.Color('#ff9a5c'), []);
  const ready = solved.filter((n) => n <= 7).length === 7;
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const speed = 0.15 + solved.length * 0.06 + (celebrate ? 0.6 : 0);
    if (file.current) {
      file.current.rotation.y += dt * speed;
      file.current.position.y = 3.25 + Math.sin(t * 0.9) * 0.06;
    }
    if (band.current) band.current.offset.x -= dt * 0.02;
    slabs.current.forEach((m, i) => {
      if (!m) return;
      const ok = solved.includes(i + 1);
      m.emissive.copy(ok ? fixedCol : stuckCol);
      m.emissiveIntensity = ok ? 1.1 : 0.25 + (Math.sin(t * 3 + i) > 0.85 ? 0.6 : 0);
    });
  });
  return (
    <group>
      <Interactable label={ready ? 'עמדת השליחה – לשלוח את הקובץ' : 'ליבת המערכת – מצב הקובץ'} onActivate={onActivate}>
        {/* floor platform */}
        <Cyl p={[0, 0.04, 0]} a={[1.9, 2.0, 0.08, 64]} c="#2c3136" m={0.7} r={0.35} />
        <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
          <ringGeometry args={[1.82, 1.86, 64]} />
          <meshStandardMaterial color="#000" emissive="#3FD0E0" emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
        {/* waist-high console ring with a segment per layer */}
        {Array.from({ length: 7 }, (_, i) => {
          const ok = solved.includes(i + 1);
          return (
            <group key={i}>
              <mesh position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2 - doorAngle(i + 1) - 0.36]} userData={{ noHighlight: true }}>
                <ringGeometry args={[1.12, 1.32, 16, 1, 0, 0.72]} />
                <meshStandardMaterial color="#000" emissive={ok ? '#65CDAA' : '#5a4630'} emissiveIntensity={ok ? 0.9 : 0.35} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 0.47, 0]}>
          <cylinderGeometry args={[1.38, 1.45, 0.94, 64, 1, true]} />
          <meshStandardMaterial color="#8f99a3" metalness={0.85} roughness={0.28} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.94, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.42, 64]} />
          <meshStandardMaterial color="#1b1f23" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* the file hologram */}
        <group ref={file} position={[0, 3.25, 0]}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[0, (i - 3) * 0.13, 0]} userData={{ noHighlight: true }}>
              <boxGeometry args={[0.72, 0.08, 0.95]} />
              <meshStandardMaterial ref={(el) => (slabs.current[i] = el)} color="#0e1418" emissive="#ff9a5c" emissiveIntensity={0.3} transparent opacity={0.85} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0.37, 0.42, 0]} rotation={[0, 0, 0]} userData={{ noHighlight: true }}>
            <boxGeometry args={[0.02, 0.12, 0.3]} />
            <meshStandardMaterial color="#000" emissive="#dfe7ee" emissiveIntensity={0.6} toneMapped={false} />
          </mesh>
        </group>
        <mesh position={[0, 3.25, 0]} userData={{ noHighlight: true }}>
          <cylinderGeometry args={[1.05, 1.05, 0.22, 64, 1, true]} />
          <meshBasicMaterial map={bandTex} ref={(m) => m && (band.current = m.map)} transparent side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
        <pointLight position={[0, 3.2, 0]} intensity={ready || celebrate ? 6 : 2} distance={6} color={ready || celebrate ? '#9ff0d6' : '#ffb37a'} />
      </Interactable>
    </group>
  );
}

/* ------------------------------------------------------------------ */

export function HubScene({ celebrate = false }) {
  const solved = useGame((s) => s.solved);
  useGame((s) => s.adminFree); // re-render doors when the admin opens them all
  const hubEvent = useGame((s) => s.hubEvent);
  const consume = useGame((s) => s.consumeHubEvent);
  const enterRoom = useGame((s) => s.enterRoom);
  const speak = useUI((s) => s.speak);
  const lookAt = useUI((s) => s.lookAt);
  const setStandpoint = useUI((s) => s.setStandpoint);
  const setFading = useUI((s) => s.setFading);
  const [opening, setOpening] = useState(null);
  const [unlocking, setUnlocking] = useState(null);
  const done7 = solved.filter((n) => n <= 7);
  const busy = useRef(false);

  // What happens when you arrive in the hub
  useEffect(() => {
    if (celebrate || !hubEvent) return;
    const timers = [];
    if (hubEvent.type === 'intro') {
      timers.push(setTimeout(() => speak(HUB_TEXT.intro), 900));
    } else if (hubEvent.type === 'solved') {
      const n = hubEvent.n;
      lookAt(doorPos(n));
      timers.push(setTimeout(() => sfx.success(), 500));
      if (n < 7) {
        timers.push(setTimeout(() => {
          lookAt(doorPos(n + 1));
          setUnlocking(n + 1);
          sfx.unlock();
        }, 2300));
        timers.push(setTimeout(() => speak(HUB_TEXT.unlocked(n + 1, LAYERS[n].en)), 2600));
      } else {
        timers.push(setTimeout(() => {
          lookAt([0, 0.9, -1.6]);
          speak(HUB_TEXT.allDone);
        }, 2300));
      }
    }
    consume();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clickDoor = (n) => {
    if (busy.current) return;
    const st = doorState(n, solved);
    if (st === 'locked') {
      sfx.buzz();
      const next = [1, 2, 3, 4, 5, 6, 7].find((k) => !solved.includes(k));
      speak(HUB_TEXT.locked(next));
      return;
    }
    if (st === 'done') {
      speak(HUB_TEXT.done);
      return;
    }
    busy.current = true;
    setStandpoint(`door${n}`);
    setTimeout(() => {
      setOpening(n);
      sfx.door();
    }, 700);
    setTimeout(() => setFading(true), 1900);
    setTimeout(() => {
      enterRoom(n);
      setFading(false);
    }, 2500);
  };

  const clickCore = () => {
    if (done7.length === 7 && !busy.current) {
      busy.current = true;
      sfx.powerUp();
      setTimeout(() => setFading(true), 600);
      setTimeout(() => {
        enterRoom(8);
        setFading(false);
      }, 1200);
      return;
    }
    speak(HUB_TEXT.core(done7.length));
  };

  return (
    <>
      <color attach="background" args={['#0b0f14']} />
      <fog attach="fog" args={['#0b0f14', 9, 22]} />
      <Hall solvedCount={done7.length} solved={solved} />
      <Core solved={solved} onActivate={clickCore} celebrate={celebrate} />
      {LAYERS.map((l) => (
        <Door
          key={l.n}
          layer={l}
          state={celebrate ? 'done' : doorState(l.n, solved)}
          opening={opening === l.n}
          unlocking={unlocking === l.n}
          onClick={() => !celebrate && clickDoor(l.n)}
        />
      ))}
      {!celebrate && <Companion position={[-1.35, 0, -3.3]} facing={0.35} onActivate={() => useUI.getState().replayBubble()} />}
    </>
  );
}
