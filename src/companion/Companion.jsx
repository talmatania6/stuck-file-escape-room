import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Interactable } from '../engine/Interactable';
import { useGame, useUI } from '../game/store';
import { COMPANION_NAME } from '../game/rooms';
import { voiceDuration, voiceLevel, voicePlaying } from '../audio/voice';

const HEIGHT = 1.72;
const BASE_Y = 0.17;

/** Where her head is on screen (px), read by the speech bubble every frame. */
export const companionAnchor = { x: 0, y: 0, visible: false };

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
      <pointLight position={[0.5, 0.9, 0.5]} color="#ef8a80" intensity={0.7} distance={3.5} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ping: the team's character, as a living hologram.                  */
/* Six cleaned, 2x-upscaled views; the one facing the camera is shown */
/* and neighbours cross-fade as you walk around her. She breathes,    */
/* sways, nods when she speaks, and is scanned in from the projector. */
/* ------------------------------------------------------------------ */

// texture order matches the turn: angle of the camera around her, in degrees (+ = her right side)
const VIEWS = [
  { file: 'ping-back', deg: -180 },
  { file: 'ping-leftprofile', deg: -90 },
  { file: 'ping-left34', deg: -45 },
  { file: 'ping-front', deg: 0 },
  { file: 'ping-right34', deg: 45 },
  { file: 'ping-rightprofile', deg: 90 },
  { file: 'ping-back', deg: 180 },
];
// where her mouth is in each view (texture px: centre x, lip seam y, half width) – measured on the images
const MOUTH = {
  'ping-front': [333, 240.5, 26, 1],
  'ping-left34': [405, 240.5, 24, 1],
  'ping-right34': [403, 240.5, 24, 1],
  'ping-leftprofile': [226, 241, 11, 1],
  'ping-rightprofile': [420, 241, 11, 1],
  'ping-back': [0, 0, 1, 0],
};
// the textures are 640×1800 with the figure 1740px tall, feet 10px above the bottom edge
const TEX_H = 1800, FIG_H = 1740, FEET_PAD = 10, TEX_W = 640;
const PLANE_H = HEIGHT * (TEX_H / FIG_H);
const PLANE_W = PLANE_H * (TEX_W / TEX_H);
const FEET_UV = FEET_PAD / TEX_H;

let texPromise = null;
function loadViews() {
  if (!texPromise) {
    const loader = new THREE.TextureLoader();
    const files = [...new Set(VIEWS.map((v) => v.file))];
    texPromise = Promise.all(
      files.map((f) =>
        loader.loadAsync(`${import.meta.env.BASE_URL}assets/ping/${f}.webp`).then((t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          return [f, t];
        }),
      ),
    ).then((pairs) => Object.fromEntries(pairs));
  }
  return texPromise;
}

const holoVertex = /* glsl */ `
  uniform float uTime;
  uniform float uNod;
  uniform float uCalm;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float h = clamp((uv.y - ${FEET_UV.toFixed(4)}) / ${(1 - FEET_UV).toFixed(4)}, 0.0, 1.0); // 0 feet → 1 head top
    float live = 1.0 - uCalm;
    // breathing: the chest rises and widens a touch
    float breath = sin(uTime * 1.55) * live;
    float chest = smoothstep(0.55, 0.72, h) * (1.0 - smoothstep(0.78, 0.9, h));
    p.x *= 1.0 + chest * breath * 0.007;
    p.y += smoothstep(0.55, 1.0, h) * breath * 0.004;
    // idle sway, pivoting at the feet
    p.x += sin(uTime * 0.62) * 0.012 * h * h * live;
    // a nod when she starts a new line: the head dips and comes back
    float head = smoothstep(0.84, 0.92, h);
    p.y -= head * uNod * 0.018;
    p.x += head * uNod * 0.004;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const holoFragment = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  uniform float uTime;
  uniform float uReveal;   // 0..1.1 of her height, scanned in from the floor
  uniform float uOpacity;
  uniform float uTalk;     // 0..1 while she's speaking
  uniform vec2 uTexel;
  uniform vec4 uMouthA;    // mouth of view A in texture px: centre x, lip seam y, half width, has-mouth
  uniform vec4 uMouthB;
  uniform float uJaw;      // 0..1 how open her mouth is right now
  varying vec2 vUv;

  float rnd(float x) { return fract(sin(x * 91.7) * 43758.5453); }

  // The jaw drops: everything below the lip seam slides down a few pixels (fading out by the chin)
  // and the gap that opens between the lips is shaded dark. Works per view, in texture pixels.
  vec2 jawWarp(vec2 uv, vec4 m, out float gap) {
    gap = 0.0;
    if (m.w < 0.5 || uJaw < 0.002) return uv;
    vec2 p = vec2(uv.x * ${TEX_W.toFixed(1)}, (1.0 - uv.y) * ${TEX_H.toFixed(1)});
    float open = uJaw * 6.0;
    float dx = (p.x - m.x) / m.z;
    float dy = p.y - m.y;
    float wide = 1.0 - smoothstep(1.0, 2.4, abs(dx));
    float below = smoothstep(-1.0, 1.5, dy) * (1.0 - smoothstep(22.0, 46.0, dy));
    p.y -= open * below * wide;
    float lens = open * max(0.0, 1.0 - dx * dx);
    gap = step(0.0, dy) * (1.0 - smoothstep(lens * 0.7, lens + 0.01, dy)) * (1.0 - smoothstep(0.8, 1.0, abs(dx)));
    return vec2(p.x / ${TEX_W.toFixed(1)}, 1.0 - p.y / ${TEX_H.toFixed(1)});
  }

  vec4 view(vec2 uv) {
    float ga, gb;
    vec4 a = texture2D(uA, jawWarp(uv, uMouthA, ga));
    vec4 b = texture2D(uB, jawWarp(uv, uMouthB, gb));
    vec3 inner = vec3(0.025, 0.007, 0.009);   // linear colour: a deep dark red inside the mouth
    a.rgb = mix(a.rgb, inner, ga * 0.92);
    b.rgb = mix(b.rgb, inner, gb * 0.92);
    // premultiplied cross-fade so edges never go grey
    return mix(vec4(a.rgb * a.a, a.a), vec4(b.rgb * b.a, b.a), uMix);
  }
  float alphaAt(vec2 uv) { return mix(texture2D(uA, uv).a, texture2D(uB, uv).a, uMix); }

  void main() {
    float h = (vUv.y - ${FEET_UV.toFixed(4)}) / ${(1 - FEET_UV).toFixed(4)};
    if (h > uReveal) discard;

    // a rare hologram glitch: one thin band slips sideways for a moment
    vec2 uv = vUv;
    float slot = floor(uTime * 0.7);
    float glitchOn = step(0.82, rnd(slot)) * step(fract(uTime * 0.7), 0.12);
    float bandY = rnd(slot + 3.1);
    uv.x += glitchOn * step(abs(h - bandY), 0.012) * (rnd(slot + 7.0) - 0.5) * 0.06;

    vec4 c = view(uv);
    if (c.a < 0.004) discard;
    vec3 rgb = c.rgb / max(c.a, 1e-4);

    // silhouette rim in Ping's coral, from how quickly the alpha falls off around this pixel
    vec2 o = uTexel * 3.0;
    float n = min(min(alphaAt(uv + vec2(o.x, 0.0)), alphaAt(uv - vec2(o.x, 0.0))),
                  min(alphaAt(uv + vec2(0.0, o.y)), alphaAt(uv - vec2(0.0, o.y))));
    float rim = clamp(c.a - n, 0.0, 1.0);

    // light-touch hologram treatment – she keeps her real colours
    float scan = 0.955 + 0.045 * sin(vUv.y * 900.0 - uTime * 6.0);
    float sweep = smoothstep(0.06, 0.0, abs(fract(h * 0.5 - uTime * 0.16) - 0.5)) * 0.22;
    float edge = smoothstep(0.035, 0.0, uReveal - h) * step(uReveal, 1.05);   // bright line while scanning in
    vec3 coral = vec3(1.0, 0.45, 0.38);
    rgb = rgb * 1.12 * scan;
    rgb += coral * (rim * (1.6 + uTalk * 0.8) + sweep * 0.35 + edge * 2.5);
    rgb += coral * 0.05 * (1.0 - h);                                          // projector light from below

    float a = c.a * uOpacity * (0.97 + 0.03 * sin(uTime * 23.0 + h * 3.0) * (1.0 - step(0.98, uOpacity)));
    gl_FragColor = vec4(rgb * a, a);
  }
`;

/**
 * Ping appears as a hologram over a floor projector. Rooms only pass
 * position / facing / onActivate.
 */
export function Companion({ position, facing = 0, onActivate, label = `${COMPANION_NAME}: לשמוע שוב` }) {
  // ?noping hides her (used when rendering stills for the intro video)
  if (typeof window !== 'undefined' && window.location.search.includes('noping')) return null;
  const [views, setViews] = useState(null);
  const plane = useRef();
  const head = useMemo(() => new THREE.Vector3(), []);
  const lastLine = useRef('');
  const nod = useRef(0);
  const talk = useRef(0);
  const reveal = useRef(0);
  const jaw = useRef(0);
  const lineStart = useRef(0);
  const lineDur = useRef(0);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uA: { value: null }, uB: { value: null }, uMix: { value: 0 },
          uTime: { value: 0 }, uReveal: { value: 0 }, uOpacity: { value: 0 },
          uNod: { value: 0 }, uTalk: { value: 0 }, uCalm: { value: 0 },
          uMouthA: { value: new THREE.Vector4() }, uMouthB: { value: new THREE.Vector4() }, uJaw: { value: 0 },
          uTexel: { value: new THREE.Vector2(1 / TEX_W, 1 / TEX_H) },
        },
        vertexShader: holoVertex,
        fragmentShader: holoFragment,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(PLANE_W, PLANE_H, 1, 48), []);

  useEffect(() => {
    let alive = true;
    loadViews().then((v) => alive && setViews(v)).catch(() => alive && setViews(false));
    return () => { alive = false; companionAnchor.visible = false; };
  }, []);
  const fallback = useMemo(() => (views === false ? fallbackTexture() : null), [views]);

  useFrame(({ camera, clock, size }, dt) => {
    const t = clock.elapsedTime;
    const calm = useGame.getState().reduceMotion;
    const u = material.uniforms;
    u.uTime.value = t;
    u.uCalm.value = calm ? 1 : 0;

    // billboard around the vertical axis
    const vx = camera.position.x - position[0];
    const vz = camera.position.z - position[2];
    if (plane.current) {
      plane.current.rotation.y = Math.atan2(vx, vz);
      plane.current.position.y = BASE_Y + PLANE_H / 2 - FEET_UV * PLANE_H + (calm ? 0 : Math.sin(t * 1.1) * 0.012);
    }

    if (views) {
      // which side of her the camera is on → the two nearest views and how far between them
      const fx = Math.sin(facing), fz = Math.cos(facing);
      const rx = -Math.cos(facing), rz = Math.sin(facing);
      const deg = THREE.MathUtils.radToDeg(Math.atan2(vx * rx + vz * rz, vx * fx + vz * fz));
      let i = 0;
      while (i < VIEWS.length - 2 && deg > VIEWS[i + 1].deg) i++;
      const a = VIEWS[i], b = VIEWS[i + 1];
      const f = (deg - a.deg) / (b.deg - a.deg);
      u.uA.value = views[a.file];
      u.uB.value = views[b.file];
      u.uMouthA.value.fromArray(MOUTH[a.file]);
      u.uMouthB.value.fromArray(MOUTH[b.file]);
      u.uMix.value = THREE.MathUtils.smoothstep(f, 0.3, 0.7); // hold each view, blend only near the seam
    }

    // scan-in from the projector, then steady
    reveal.current = calm ? 1.2 : Math.min(1.2, reveal.current + dt * (views ? 0.55 : 0));
    u.uReveal.value = reveal.current;
    u.uOpacity.value = views ? Math.min(1, reveal.current * 1.4) : 0;

    // nod with each new line; a soft glow while she talks
    const ui = useUI.getState();
    const b = ui.bubble;
    const key = b ? `${b.key}:${b.i}` : '';
    if (key && key !== lastLine.current) {
      if (!calm) nod.current = 1;
      lineStart.current = t;
      const text = b.lines[b.i]?.text || '';
      lineDur.current = voiceDuration(text) || Math.min(9, 0.4 + text.length * 0.062);
    }
    lastLine.current = key;
    const speaking = Boolean(b && !ui.bubbleCollapsed && b.lines[b.i]?.who !== 'glitch');
    talk.current += ((speaking ? 1 : 0) - talk.current) * (1 - Math.exp(-dt * 4));
    nod.current = Math.max(0, nod.current - dt * 1.6);
    u.uNod.value = Math.sin(nod.current * Math.PI); // down and back up
    u.uTalk.value = talk.current * (0.6 + 0.4 * Math.sin(t * 7.0));

    // her mouth: follows the recorded voice; without sound, a speaking rhythm for as long as the line lasts
    let target = 0;
    if (speaking && !calm) {
      const lvl = voiceLevel();
      if (lvl >= 0 && voicePlaying()) target = Math.min(1, Math.max(0, (lvl - 0.04) * 1.8));
      else if (t - lineStart.current < lineDur.current) {
        const syl = Math.max(0, Math.sin(t * 10.5) * 0.5 + Math.sin(t * 6.3 + 1.7) * 0.35 + 0.15);
        target = Math.min(1, syl * (0.65 + 0.35 * Math.sin(t * 2.1)));
      }
    }
    jaw.current += (target - jaw.current) * (1 - Math.exp(-dt * (target > jaw.current ? 28 : 16)));
    u.uJaw.value = jaw.current;

    // project her head to screen space for the speech bubble
    head.set(position[0], BASE_Y + HEIGHT * 0.92, position[2]).project(camera);
    companionAnchor.visible = head.z < 1 && Math.abs(head.x) < 1.05 && Math.abs(head.y) < 1.05 && !ui.fading;
    companionAnchor.x = (head.x * 0.5 + 0.5) * size.width;
    companionAnchor.y = (-head.y * 0.5 + 0.5) * size.height;
  });

  return (
    <group position={position}>
      <Projector />
      <Interactable label={label} onActivate={onActivate}>
        <mesh ref={plane} geometry={geometry} material={material} renderOrder={6} userData={{ noShadow: true }} />
      </Interactable>
      {fallback && (
        <sprite position={[0, BASE_Y + HEIGHT / 2, 0]} scale={[HEIGHT * 0.4, HEIGHT, 1]}>
          <spriteMaterial map={fallback} transparent />
        </sprite>
      )}
    </group>
  );
}
