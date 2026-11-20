import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Interactable } from '../engine/Interactable';
import { loadCompanionSheet, ANGLE } from './companionSheet';
import { useGame, useUI } from '../game/store';
import { COMPANION_NAME } from '../game/rooms';

const HEIGHT = 1.72;
const BASE_Y = 0.17;

/** Where her head is on screen (px), read by the speech bubble every frame. */
export const companionAnchor = { x: 0, y: 0, visible: false };

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Keys out the grey studio backdrop of the character sheet (sampled at the panel
// edges on the same row); the figure itself is untouched apart from soft scanlines.
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  uniform float opacity;
  uniform float keyed;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    float a = c.a;
    if (keyed > 0.5) {
      vec3 bgL = texture2D(map, vec2(0.07, vUv.y)).rgb;
      vec3 bgR = texture2D(map, vec2(0.93, vUv.y)).rgb;
      vec3 bg = mix(bgL, bgR, vUv.x);
      float d = length(c.rgb - bg);
      float red = max(0.0, c.r - max(c.g, c.b));
      a = clamp(smoothstep(0.035, 0.12, d) + red * 3.0, 0.0, 1.0);
      a *= smoothstep(0.0, 0.05, vUv.y);
    }
    float scan = 0.92 + 0.08 * sin(vUv.y * 520.0 - time * 5.0);
    float band = smoothstep(0.0, 0.02, abs(fract(vUv.y * 0.6 - time * 0.18) - 0.5)) * 0.1 + 0.9;
    gl_FragColor = vec4(c.rgb * 1.08 * scan * band, a * opacity * 0.95);
    if (gl_FragColor.a < 0.02) discard;
  }
`;

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(255,170,160,0.55)');
  grad.addColorStop(0.35, 'rgba(255,170,160,0.12)');
  grad.addColorStop(1, 'rgba(255,170,160,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

function fallbackTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 640;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(239,140,130,0.9)';
  g.fillStyle = 'rgba(220,215,215,0.25)';
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(128, 70, 34, 44, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The floor projector she's cast from: a machined base with a turning segmented emitter. */
function Projector() {
  const segs = useRef();
  const lens = useRef();
  const glow = useMemo(() => radialTexture('rgba(239,138,128,0.55)', 'rgba(239,138,128,0)'), []);
  const lensTex = useMemo(() => radialTexture('rgba(255,225,215,1)', 'rgba(120,40,40,1)'), []);
  const beam = useMemo(beamTexture, []);
  const motes = useRef();
  const N = 26;
  const motePos = useMemo(() => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = Math.random() * 0.3, t = Math.random() * Math.PI * 2;
      a[i * 3] = Math.cos(t) * r; a[i * 3 + 1] = Math.random() * 1.8; a[i * 3 + 2] = Math.sin(t) * r;
    }
    return a;
  }, []);
  useFrame(({ clock }, dt) => {
    const calm = useGame.getState().reduceMotion;
    if (segs.current && !calm) segs.current.rotation.y += dt * 0.6;
    if (lens.current) lens.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 2.2) * 0.25;
    if (motes.current && !calm) {
      const p = motes.current.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = p.array[i * 3 + 1] + dt * (0.25 + (i % 5) * 0.06);
        if (y > 1.9) y = 0.15;
        p.array[i * 3 + 1] = y;
      }
      p.needsUpdate = true;
    }
  });
  return (
    <group>
      {/* soft light pooled on the floor */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* stepped machined base */}
      <mesh position={[0, 0.03, 0]} userData={{ noHighlight: true }}>
        <cylinderGeometry args={[0.5, 0.54, 0.06, 64]} />
        <meshStandardMaterial color="#2a2d32" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.085, 0]} userData={{ noHighlight: true }}>
        <cylinderGeometry args={[0.42, 0.46, 0.05, 64]} />
        <meshStandardMaterial color="#b9c0c7" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* turning ring of 16 emitter segments */}
      <group ref={segs} position={[0, 0.115, 0]}>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35]} rotation={[0, -a, 0]} userData={{ noHighlight: true }}>
              <boxGeometry args={[0.03, 0.012, 0.09]} />
              <meshStandardMaterial color="#1a0d0c" emissive="#ef8a80" emissiveIntensity={i % 4 === 0 ? 2.4 : 1.1} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {/* lens */}
      <mesh position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
        <circleGeometry args={[0.24, 48]} />
        <meshStandardMaterial ref={lens} color="#1a1416" map={lensTex} emissiveMap={lensTex} emissive="#ffb8ac" emissiveIntensity={1.2} metalness={0.2} roughness={0.1} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.113, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noHighlight: true }}>
        <ringGeometry args={[0.24, 0.255, 48]} />
        <meshStandardMaterial color="#000" emissive="#ffd2c8" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* beam fading upward */}
      <mesh position={[0, 1.0, 0]} userData={{ noHighlight: true }}>
        <cylinderGeometry args={[0.46, 0.24, 1.8, 48, 1, true]} />
        <meshBasicMaterial map={beam} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.5} />
      </mesh>
      <points ref={motes}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={N} array={motePos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#ffb3a8" size={0.018} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <pointLight position={[0, 0.9, 0]} color="#ef8a80" intensity={1.4} distance={3.5} decay={2} />
    </group>
  );
}

/**
 * The companion appears as a hologram over a floor projector. Which of the six
 * sheet angles is shown depends on where the camera stands relative to her
 * facing direction. Rooms only pass position / facing / onActivate, so this can
 * later be swapped for a real 3D model.
 */
export function Companion({ position, facing = 0, onActivate, label = `${COMPANION_NAME} – לשמוע שוב` }) {
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    loadCompanionSheet().then(setSheet);
    return () => { companionAnchor.visible = false; };
  }, []);
  const fallback = useMemo(fallbackTexture, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { map: { value: fallback }, time: { value: 0 }, opacity: { value: 0 }, keyed: { value: 0 } },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [fallback],
  );
  const plane = useRef();
  const appear = useRef(0);
  const head = useMemo(() => new THREE.Vector3(), []);
  const aspect = sheet ? sheet.aspect : 0.4;

  useFrame(({ camera, clock, size }, dt) => {
    const t = clock.elapsedTime;
    const calm = useGame.getState().reduceMotion;
    appear.current = Math.min(1, appear.current + dt * 0.55);
    const vx = camera.position.x - position[0];
    const vz = camera.position.z - position[2];
    if (plane.current) {
      plane.current.rotation.y = Math.atan2(vx, vz);
      plane.current.position.y = BASE_Y + HEIGHT / 2 + (calm ? 0 : Math.sin(t * 1.1) * 0.02);
    }
    const fx = Math.sin(facing), fz = Math.cos(facing);
    const rx = -Math.cos(facing), rz = Math.sin(facing);
    const deg = THREE.MathUtils.radToDeg(Math.atan2(vx * rx + vz * rz, vx * fx + vz * fz));
    const a = Math.abs(deg);
    let idx = ANGLE.FRONT;
    if (a >= 22.5 && a < 67.5) idx = deg > 0 ? ANGLE.RIGHT_34 : ANGLE.LEFT_34;
    else if (a >= 67.5 && a < 135) idx = deg > 0 ? ANGLE.RIGHT_PROFILE : ANGLE.LEFT_PROFILE;
    else if (a >= 135) idx = ANGLE.BACK;
    material.uniforms.map.value = sheet ? sheet.slices[idx] : fallback;
    material.uniforms.keyed.value = sheet ? 1 : 0;
    material.uniforms.time.value = t;
    const warming = appear.current < 1 && !calm ? (Math.sin(t * 60) > 0 ? 1 : 0.35) : 1;
    material.uniforms.opacity.value = appear.current * warming;

    // project her head to screen space for the speech bubble
    head.set(position[0], BASE_Y + HEIGHT * 0.9, position[2]).project(camera);
    companionAnchor.visible = head.z < 1 && Math.abs(head.x) < 1.05 && Math.abs(head.y) < 1.05 && !useUI.getState().fading;
    companionAnchor.x = (head.x * 0.5 + 0.5) * size.width;
    companionAnchor.y = (-head.y * 0.5 + 0.5) * size.height;
  });

  return (
    <group position={position}>
      <Projector />
      <Interactable label={label} onActivate={onActivate}>
        <mesh ref={plane} material={material}>
          <planeGeometry args={[HEIGHT * aspect, HEIGHT]} />
        </mesh>
      </Interactable>
    </group>
  );
}
