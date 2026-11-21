// Shared environmental dressing for the layer rooms (7 x 7 m shells).
// Everything here is decoration: never raycastable, so it can't block a click,
// and it is placed on walls / ceiling / floor away from the puzzle hotspots.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { metal, sign } from './textures';

const NO_RAY = () => null;
const TEAL = new THREE.Color('#69D6B2');

/** Walk a group and make every mesh non-raycastable (pure decoration). */
function useDecor(ref) {
  useEffect(() => {
    ref.current?.traverse((o) => {
      if (o.isMesh || o.isPoints) {
        o.raycast = NO_RAY;
        o.userData.noHighlight = true;
      }
    });
  }, [ref]);
}

/* ------------------------------------------------------------------ */

/** Wall-mounted equipment cabinet: vents, ID plate, async status LEDs and a live bar graph. */
export function WallUnit({ position, rotation = [0, 0, 0], accent = '#43D9E8', id = 'NX-01', scale = 1 }) {
  const g = useRef();
  useDecor(g);
  const leds = useRef([]);
  const bars = useRef([]);
  const tex = useMemo(
    () => ({
      body: metal('#26313a', id.length * 7 + 3, [1, 1]),
      plate: sign({ w: 256, h: 64, bg: '#cfd6da', pad: 10, align: 'center', aged: false, lines: [{ text: id, size: 36, color: '#16202a', font: 'monospace' }] }),
    }),
    [id],
  );
  const col = useMemo(() => new THREE.Color(accent), [accent]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    leds.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = Math.sin(t * (1.3 + i * 0.7) + i * 2.1) > 0.2 ? 2.2 : 0.25;
    });
    bars.current.forEach((b, i) => {
      if (b) b.scale.y = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (0.9 + i * 0.37) + i));
    });
  });
  return (
    <group ref={g} position={position} rotation={rotation} scale={scale}>
      <mesh><boxGeometry args={[0.72, 1.0, 0.18]} /><meshStandardMaterial map={tex.body} metalness={0.65} roughness={0.42} /></mesh>
      {/* recessed front + bevel trim */}
      <mesh position={[0, 0, 0.091]}><planeGeometry args={[0.64, 0.92]} /><meshStandardMaterial color="#1a232b" metalness={0.6} roughness={0.5} /></mesh>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0, 0.095]}><boxGeometry args={[0.012, 0.98, 0.01]} /><meshStandardMaterial color="#647783" metalness={0.85} roughness={0.25} /></mesh>
      ))}
      {/* vents */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, -0.36 + i * 0.035, 0.094]}><boxGeometry args={[0.46, 0.012, 0.004]} /><meshStandardMaterial color="#0b1014" roughness={0.9} /></mesh>
      ))}
      {/* ID plate */}
      <mesh position={[0, 0.4, 0.094]}><planeGeometry args={[0.3, 0.075]} /><meshStandardMaterial map={tex.plate} roughness={0.7} /></mesh>
      {/* screen with a live bar graph */}
      <mesh position={[0, 0.12, 0.093]}><planeGeometry args={[0.5, 0.3]} /><meshStandardMaterial color="#04080b" roughness={0.18} metalness={0.15} /></mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} position={[-0.195 + i * 0.065, 0.0, 0.095]}>
          <mesh ref={(el) => (bars.current[i] = el)} position={[0, 0.12, 0]}>
            <planeGeometry args={[0.04, 0.24]} />
            <meshBasicMaterial color={col} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
      {/* status LEDs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.2 - i * 0.07, -0.17, 0.1]}>
          <sphereGeometry args={[0.014, 10, 8]} />
          <meshStandardMaterial ref={(el) => (leds.current[i] = el)} color="#111" emissive={i === 1 ? TEAL : col} emissiveIntensity={1} toneMapped={false} />
        </mesh>
      ))}
      {/* conduit up to the ceiling */}
      <mesh position={[0.24, 1.5, -0.03]}><cylinderGeometry args={[0.022, 0.022, 2.0, 10]} /><meshStandardMaterial color="#6d757c" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  );
}

/** Ceiling cable tray running east–west, with a few bundled cables. */
export function CeilingTray({ z = 1.0, w = 7, h = 3.6 }) {
  const g = useRef();
  useDecor(g);
  return (
    <group ref={g} position={[0, h - 0.42, z]}>
      <mesh><boxGeometry args={[w - 0.4, 0.05, 0.4]} /><meshStandardMaterial color="#3a4651" metalness={0.75} roughness={0.35} /></mesh>
      {[-0.19, 0.19].map((dz) => (
        <mesh key={dz} position={[0, 0.05, dz]}><boxGeometry args={[w - 0.4, 0.1, 0.015]} /><meshStandardMaterial color="#4a5763" metalness={0.75} roughness={0.35} /></mesh>
      ))}
      {[-0.1, -0.03, 0.05, 0.12].map((dz, i) => (
        <mesh key={dz} position={[0, 0.05, dz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, w - 0.5, 8]} />
          <meshStandardMaterial color={['#151515', '#2b2018', '#1d2a36', '#171717'][i]} roughness={0.7} />
        </mesh>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-(w - 1.4) / 2 + i * ((w - 1.4) / 4), 0.2, 0]}><boxGeometry args={[0.03, 0.4, 0.03]} /><meshStandardMaterial color="#2d3339" metalness={0.6} roughness={0.5} /></mesh>
      ))}
    </group>
  );
}

/** Two lit guide lines and chevrons from the exit toward the room's centre. */
export function FloorGuides({ accent = '#43D9E8', d = 7, solved }) {
  const g = useRef();
  useDecor(g);
  const mats = useRef([]);
  const chev = useRef([]);
  const D = d / 2;
  const len = D + 0.6;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats.current.forEach((m) => m && (m.emissiveIntensity = solved ? 1.1 : 0.55));
    chev.current.forEach((m, i) => {
      if (!m) return;
      const k = ((t * 0.6 - i * 0.22) % 1 + 1) % 1; // a soft wave running toward the room
      m.opacity = 0.15 + Math.pow(Math.sin(k * Math.PI), 6) * 0.75;
    });
  });
  return (
    <group ref={g}>
      {[-0.95, 0.95].map((x, i) => (
        <mesh key={x} position={[x, 0.006, D - len / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, len]} />
          <meshStandardMaterial ref={(el) => (mats.current[i] = el)} color="#000" emissive={accent} emissiveIntensity={0.55} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[0, 0.007, D - 0.6 - i * 0.45]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[0.16, 0.19, 4, 1, Math.PI * 0.5, Math.PI]} />
          <meshBasicMaterial ref={(el) => (chev.current[i] = el)} color={accent} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Success moment: when the room flips to solved during the visit, a ring of light
 * sweeps across the floor (450ms ease-out, one overshoot) and a soft accent glow stays.
 */
export function SolvedBurst({ solved, accent = '#69D6B2' }) {
  const g = useRef();
  useDecor(g);
  const ring = useRef();
  const glow = useRef();
  const light = useRef();
  const was = useRef(solved);
  const t0 = useRef(-1);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const grd = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = grd;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (solved && !was.current) {
      was.current = true;
      t0.current = t;
    }
    if (glow.current) glow.current.opacity += ((solved ? 0.22 : 0) - glow.current.opacity) * 0.04;
    const k = t0.current < 0 ? 1 : Math.min(1, (t - t0.current) / 1.4);
    if (ring.current) {
      const e = 1 - Math.pow(1 - k, 3);
      ring.current.scale.setScalar(0.2 + e * 3.6);
      ring.current.material.opacity = k < 1 ? (1 - k) * 0.9 : 0;
    }
    if (light.current) light.current.intensity = k < 1 ? Math.sin(k * Math.PI) * 9 : 0;
  });
  return (
    <group ref={g}>
      <mesh ref={ring} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.0, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial ref={glow} map={tex} color={accent} transparent opacity={solved ? 0.22 : 0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.2, 0]} color={accent} intensity={0} distance={7} decay={1.5} />
    </group>
  );
}

/** The standard dressing set for a 7 x 7 room: two wall units in the north corners, a ceiling tray, floor guides and the success burst. */
export function RoomDressing({ accent, solved, h = 3.6, ids = ['NX-01', 'NX-02'], units = true, tray = true }) {
  return (
    <>
      {units && (
        <>
          <WallUnit position={[-2.75, 1.55, -3.38]} accent={accent} id={ids[0]} />
          <WallUnit position={[2.75, 1.55, -3.38]} accent={accent} id={ids[1]} />
        </>
      )}
      {tray && <CeilingTray z={1.1} h={h} />}
      <FloorGuides accent={accent} solved={solved} />
      <SolvedBurst solved={solved} accent="#69D6B2" />
    </>
  );
}
