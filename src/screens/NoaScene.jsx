// Opening scene: Noa at her desk late at night, the upload failing, a torn cable sparking.
// The camera holds one shot from her side and only drifts a little. Noa is lit mostly from the screen,
// the desk lamp and the window.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Cyl } from '../engine/kit';
import { wood, sign, concrete } from '../engine/textures';
import { useGame } from '../game/store';

function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#16273d';
  g.fillRect(0, 0, 1024, 640);
  // a mail window
  g.fillStyle = '#e9eef3';
  g.fillRect(70, 60, 884, 520);
  g.fillStyle = '#c9d3dc';
  g.fillRect(70, 60, 884, 50);
  g.fillStyle = '#9aa7b3';
  for (let i = 0; i < 7; i++) g.fillRect(110, 150 + i * 46, 300 + ((i * 97) % 380), 14);
  // error dialog – large, so it reads from across the room
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(70, 60, 884, 520);
  g.fillStyle = '#ffffff';
  g.fillRect(100, 110, 824, 430);
  g.fillStyle = '#d64545';
  g.fillRect(100, 110, 824, 116);
  g.direction = 'rtl';
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = '800 76px Heebo, sans-serif';
  g.fillText('השליחה נכשלה', 512, 194);
  g.fillStyle = '#1b2430';
  g.font = '600 50px Heebo, sans-serif';
  g.fillText('עבודה_סופית.pdf לא נשלח.', 512, 300);
  g.fillText('בדקו את החיבור ונסו שוב.', 512, 370);
  g.fillStyle = '#3a7bd5';
  g.fillRect(382, 418, 260, 84);
  g.fillStyle = '#fff';
  g.font = '700 46px Heebo, sans-serif';
  g.fillText('נסו שוב', 512, 476);
  // clock in the corner
  g.textAlign = 'left';
  g.direction = 'ltr';
  g.fillStyle = '#ffcf8a';
  g.font = '700 30px Rubik, sans-serif';
  g.fillText('23:47', 880, 620);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0a1424');
  grad.addColorStop(1, '#1d2c46');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`;
    g.fillRect(Math.random() * 512, Math.random() * 240, 2, 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = i * 38, h = 120 + ((i * 53) % 160);
    g.fillStyle = '#0b1220';
    g.fillRect(x, 512 - h, 34, h);
    for (let k = 0; k < 18; k++) {
      if (Math.random() > 0.55) {
        g.fillStyle = Math.random() > 0.3 ? '#ffcf8a' : '#9fe3ea';
        g.fillRect(x + 6 + (k % 3) * 9, 512 - h + 10 + Math.floor(k / 3) * 18, 5, 8);
      }
    }
  }
  g.fillStyle = '#e8eef3';
  g.beginPath(); g.arc(420, 80, 26, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sparks spraying from the torn cable ends. */
function Sparks({ position }) {
  const N = 60;
  const pts = useRef();
  const light = useRef();
  const data = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const vel = Array.from({ length: N }, () => new THREE.Vector3());
    const life = new Float32Array(N).fill(-1);
    return { pos, vel, life };
  }, []);
  const burst = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const { pos, vel, life } = data;
    // irregular bursts
    if (t > burst.current) {
      burst.current = t + 0.6 + Math.random() * 1.8;
      for (let i = 0; i < N; i++) {
        if (life[i] < 0 && Math.random() > 0.35) {
          life[i] = 0.4 + Math.random() * 0.6;
          pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
          vel[i].set((Math.random() - 0.5) * 1.6, Math.random() * 1.6 + 0.3, (Math.random() - 0.5) * 1.6);
        }
      }
      if (light.current) light.current.intensity = 6;
    }
    for (let i = 0; i < N; i++) {
      if (life[i] < 0) { pos[i * 3 + 1] = -100; continue; }
      life[i] -= dt;
      vel[i].y -= 4 * dt;
      pos[i * 3] += vel[i].x * dt;
      pos[i * 3 + 1] += vel[i].y * dt;
      pos[i * 3 + 2] += vel[i].z * dt;
    }
    if (pts.current) pts.current.geometry.attributes.position.needsUpdate = true;
    if (light.current) light.current.intensity = Math.max(0, light.current.intensity - dt * 18);
  });
  return (
    <group position={position}>
      <points ref={pts}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={N} array={data.pos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#ffd27a" size={0.035} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <pointLight ref={light} color="#ffb04a" intensity={0} distance={2.2} decay={2} />
    </group>
  );
}

/* Noa in her gaming chair: six photo views cut from her character sheet, standing in for a
 * 3D model. A card turns toward the camera, and as the camera circles the room the views
 * cross-fade into each other (front → 3/4 → profile → back …), so she turns with the room
 * instead of snapping. Each view is pinned at its own centre of mass, so the chair stays on
 * the same spot on the floor whichever view is showing. */
const NOA_VIEWS = [
  ['FRONT', 'front', 0],
  ['RIGHT_34', 'right34', 45],
  ['RIGHT_PROFILE', 'rightprofile', 90],
  ['BACK', 'back', 180],
  ['LEFT_PROFILE', 'leftprofile', -90],
  ['LEFT_34', 'left34', -45],
];
const NOA_POS = new THREE.Vector3(0.3, 0, 0.36);
const NOA_FACING = Math.PI; // she faces the desk (-z)
const M_PER_PX = 1.4 / 600; // the front view (600px tall, chair back included) ≈ 1.4 m, so she sits at desk height

/** Camera angle around Noa in degrees: 0 = in front of her face, +90 = her right side. */
function noaAngle(cam) {
  const vx = cam.x - NOA_POS.x, vz = cam.z - NOA_POS.z;
  const fx = Math.sin(NOA_FACING), fz = Math.cos(NOA_FACING);
  const rx = -Math.cos(NOA_FACING), rz = Math.sin(NOA_FACING);
  return (Math.atan2(vx * rx + vz * rz, vx * fx + vz * fz) * 180) / Math.PI;
}

/** The two neighbouring views around this angle and how far we are from the first to the second. */
const RING = [...NOA_VIEWS].sort((p, q) => p[2] - q[2]); // -90, -45, 0, 45, 90, 180
function blendViews(deg) {
  for (let i = 0; i < RING.length; i++) {
    const a = RING[i], b = RING[(i + 1) % RING.length];
    const from = a[2], to = b[2] <= from ? b[2] + 360 : b[2];
    const d = deg < from ? deg + 360 : deg;
    if (d >= from && d < to) {
      const t = (d - from) / (to - from);
      // hold each view for most of its range, fade only around the midpoint
      const w = THREE.MathUtils.smoothstep(t, 0.3, 0.7);
      return [a[0], b[0], w];
    }
  }
  return [RING[0][0], RING[1][0], 0];
}

/** Alpha-weighted centre of a cut-out, as a fraction of its width. */
function massCentre(img) {
  const w = 64, h = Math.round((64 * img.height) / img.width);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  let sum = 0, sx = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const al = d[(y * w + x) * 4 + 3];
    sum += al;
    sx += al * (x + 0.5);
  }
  return sum ? sx / sum / w : 0.5;
}

function Noa() {
  const group = useRef();
  const cards = [useRef(), useRef()];
  const [views, setViews] = useState(null);
  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    Promise.all(
      NOA_VIEWS.map(([k, f]) =>
        loader.loadAsync(`${import.meta.env.BASE_URL}assets/noa/noa-${f}.webp`).then((t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
          const w = t.image.width * M_PER_PX, h = t.image.height * M_PER_PX;
          return [k, { tex: t, w, h, shift: (0.5 - massCentre(t.image)) * w }];
        }),
      ),
    )
      .then((list) => alive && setViews(Object.fromEntries(list)))
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => () => views && Object.values(views).forEach((v) => v.tex.dispose()), [views]);
  useFrame(({ camera }) => {
    if (!views || !group.current) return;
    group.current.rotation.y = Math.atan2(camera.position.x - NOA_POS.x, camera.position.z - NOA_POS.z);
    const [a, b, w] = blendViews(noaAngle(camera.position));
    [[a, 1 - w], [b, w]].forEach(([key, op], i) => {
      const m = cards[i].current;
      if (!m) return;
      const v = views[key];
      if (m.material.map !== v.tex) {
        m.material.map = v.tex;
        m.material.emissiveMap = v.tex;
        m.material.needsUpdate = true;
      }
      m.scale.set(v.w, v.h, 1);
      m.position.set(v.shift, v.h / 2, i * 0.002);
      m.material.opacity = op;
      m.visible = op > 0.01;
    });
  });
  if (!views) return null;
  return (
    <group ref={group} position={NOA_POS}>
      {cards.map((r, i) => (
        <mesh key={i} ref={r} renderOrder={10 + i}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial transparent depthWrite={false} alphaTest={0.02} roughness={0.85} emissive="#ffffff" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* soft contact shadow on the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Cables() {
  // two cables from the PC to the wall socket – one torn in the middle, ends frayed
  const geo = useMemo(() => {
    const mk = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, r, 8, false);
    return [
      mk([[0.55, 0.15, -0.15], [0.7, 0.02, 0.0], [1.0, 0.02, -0.2], [1.25, 0.03, -0.45]], 0.018),
      mk([[1.42, 0.03, -0.55], [1.6, 0.02, -0.75], [1.75, 0.1, -0.98], [1.78, 0.3, -1.06]], 0.018),
      mk([[0.5, 0.15, -0.2], [0.8, 0.02, -0.3], [1.3, 0.02, -0.7], [1.7, 0.12, -1.0], [1.74, 0.32, -1.06]], 0.014),
    ];
  }, []);
  return (
    <group>
      {geo.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={i === 2 ? '#3a3f46' : '#15171a'} roughness={0.6} />
        </mesh>
      ))}
      {/* frayed copper at the tear */}
      {[[1.27, 0.03, -0.47], [1.4, 0.03, -0.53]].map((p, i) => (
        <group key={i} position={p}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0.012 * (k - 1), 0, 0.01 * k]} rotation={[0, i ? 2.3 + k * 0.3 : -0.8 + k * 0.3, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.06, 4]} />
              <meshStandardMaterial color="#c47a3a" emissive="#ff8a2a" emissiveIntensity={0.6} metalness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {/* wall socket */}
      <Box p={[1.78, 0.32, -1.11]} s={[0.12, 0.16, 0.03]} c="#e8e4dc" r={0.5} />
    </group>
  );
}

/* One fixed shot from Noa's right, a little behind her: her profile, the desk and the failing
 * upload on the screen. The camera only drifts a few degrees (a flat cut-out cannot survive a
 * full spin), and the aim sits to the right of the scene so she stays clear of the start panel. */
const SHOT = { deg: 114, sway: 3, dist: 2.45, y: 1.32, aim: new THREE.Vector3(0.1, 0.8, -0.95) };
function DriftCam() {
  const calm = useGame((s) => s.reduceMotion);
  useFrame(({ camera, clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    const deg = SHOT.deg + Math.sin(t * 0.11) * SHOT.sway;
    const r = (deg * Math.PI) / 180;
    const d = SHOT.dist + Math.sin(t * 0.07) * 0.08;
    // deg is measured around Noa: 0 = in front of her face (-z), +90 = her right side (+x)
    camera.position.set(NOA_POS.x + Math.sin(r) * d, SHOT.y + Math.sin(t * 0.09) * 0.04, NOA_POS.z - Math.cos(r) * d);
    camera.lookAt(SHOT.aim);
  });
  return null;
}

export function NoaScene() {
  const t = useMemo(() => ({ screen: screenTexture(), win: windowTexture(), desk: wood([1, 1]), floor: wood([3, 3]), wall: concrete([2, 1], '#3b3f4a', 91) }), []);
  const flicker = useRef();
  const poster = useMemo(() => sign({ w: 512, h: 700, bg: '#2a2f3a', pad: 40, align: 'center', lines: [{ text: 'הגשה', size: 80, color: '#ffcf8a', font: 'Rubik' }, { text: 'עד 23:59', size: 70, color: '#ffffff', font: 'Rubik', gap: 20 }, { text: '!!!', size: 90, color: '#EF6D73', gap: 30 }] }), []);
  useFrame(({ clock }) => {
    if (flicker.current) flicker.current.intensity = 2.4 + (Math.sin(clock.elapsedTime * 21) > 0.85 ? -1.6 : 0);
  });
  return (
    <>
      <color attach="background" args={['#070a10']} />
      <fog attach="fog" args={['#070a10', 4, 9]} />
      <ambientLight intensity={0.25} color="#7f90b0" />
      <hemisphereLight args={['#5a6a8a', '#1a1410', 0.3]} />
      {/* room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={t.floor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.6, -1.15]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial map={t.wall} roughness={0.95} />
      </mesh>
      <mesh position={[2.2, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial map={t.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-2.6, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial map={t.wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.6, 2.8]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial map={t.wall} roughness={0.95} />
      </mesh>
      {/* window with the city at night */}
      <group position={[-1.3, 1.65, -1.14]}>
        <mesh><planeGeometry args={[1.2, 1.0]} /><meshBasicMaterial map={t.win} toneMapped={false} /></mesh>
        <Box p={[0, 0, 0.02]} s={[1.28, 0.04, 0.05]} c="#cfd3d8" r={0.5} />
        <Box p={[0, 0, 0.02]} s={[0.04, 1.06, 0.05]} c="#cfd3d8" r={0.5} />
        <Box p={[0, -0.53, 0.06]} s={[1.36, 0.05, 0.14]} c="#cfd3d8" r={0.5} />
        <pointLight position={[0, 0, 0.6]} color="#7f9fd0" intensity={1.4} distance={3} />
      </group>
      <mesh position={[0.9, 1.7, -1.13]}><planeGeometry args={[0.42, 0.58]} /><meshStandardMaterial map={poster} roughness={0.8} /></mesh>
      {/* desk */}
      <group position={[0.35, 0, -0.55]}>
        <Box p={[0, 0.74, 0]} s={[1.5, 0.05, 0.75]} map={t.desk} r={0.55} />
        {[-0.7, 0.7].map((x) => <Box key={x} p={[x, 0.36, 0]} s={[0.05, 0.72, 0.7]} c="#d9d5cc" r={0.5} />)}
        {/* monitor */}
        <group position={[0, 1.1, -0.2]}>
          <Box s={[0.82, 0.5, 0.04]} c="#121418" m={0.5} r={0.35} />
          <mesh position={[0, 0, 0.021]}><planeGeometry args={[0.78, 0.46]} /><meshBasicMaterial map={t.screen} toneMapped={false} /></mesh>
          <Box p={[0, -0.32, -0.02]} s={[0.06, 0.18, 0.04]} c="#121418" />
          <Box p={[0, -0.4, 0]} s={[0.26, 0.015, 0.16]} c="#121418" />
          <pointLight ref={flicker} position={[0, 0, 0.5]} color="#b8d4ff" intensity={2.4} distance={3.2} decay={1.6} />
        </group>
        <Box p={[0, 0.775, 0.12]} s={[0.46, 0.02, 0.15]} c="#2b2e33" r={0.6} />
        <Box p={[0.36, 0.775, 0.14]} s={[0.07, 0.02, 0.1]} c="#2b2e33" r={0.6} />
        {/* mug + papers + phone */}
        <Cyl p={[-0.55, 0.81, 0.1]} a={[0.045, 0.04, 0.1, 16]} c="#c64f3f" r={0.5} />
        <Box p={[0.55, 0.77, 0.05]} s={[0.28, 0.005, 0.36]} rot={[0, 0.3, 0]} c="#efeae0" r={0.9} />
        <Box p={[0.5, 0.775, -0.05]} s={[0.28, 0.005, 0.36]} rot={[0, -0.15, 0]} c="#f6f2ea" r={0.9} />
        <Box p={[-0.35, 0.775, 0.22]} s={[0.08, 0.01, 0.15]} c="#111" m={0.6} r={0.3} />
        {/* desk lamp */}
        <group position={[-0.6, 0.77, -0.2]}>
          <Cyl p={[0, 0.015, 0]} a={[0.08, 0.09, 0.03, 18]} c="#2b2b2b" m={0.6} r={0.4} />
          <Cyl p={[0.05, 0.2, 0]} a={[0.01, 0.01, 0.4, 8]} rot={[0, 0, -0.3]} c="#2b2b2b" m={0.6} r={0.4} />
          <Cyl p={[0.16, 0.37, 0]} a={[0.04, 0.09, 0.1, 18, 1, true]} rot={[0, 0, 0.6]} c="#2b2b2b" m={0.6} r={0.4} side={THREE.DoubleSide} />
          <pointLight position={[0.2, 0.3, 0.1]} color="#ffcf8a" intensity={2.2} distance={2.6} decay={1.8} />
        </group>
        {/* PC tower under the desk */}
        <group position={[0.55, 0, -0.1]}>
          <Box p={[0, 0.24, 0]} s={[0.2, 0.46, 0.44]} c="#16181c" m={0.5} r={0.4} />
          <Box p={[0, 0.4, 0.222]} s={[0.12, 0.01, 0.004]} c="#000" e="#3FD0E0" ei={1.4} noHighlight />
        </group>
      </group>
      <Cables />
      <Sparks position={[1.33, 0.05, -0.5]} />
      <Noa />
      <DriftCam />
    </>
  );
}
