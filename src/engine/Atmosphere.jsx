// Ambient dust motes drifting through the light – makes every space feel lived-in.
// Cheap: one Points object, a few hundred vertices, no shadows, never raycastable.
// Size is in screen pixels, so a mote drifting past the camera never balloons.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuality } from '../game/settings';

const still = (() => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Box-shaped volume (w × h × d, centred on x/z, from the floor up) or a
 * cylinder when `radius` is given.
 */
function DustField({ w = 7, d = 7, h = 3.5, radius, minRadius = 0, count = 260, color = '#ffe2bf', size = 2.4, opacity = 0.55, center = [0, 0, 0] }) {
  const pts = useRef();
  const { geom, seeds, map } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x, z;
      if (radius) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(minRadius * minRadius + Math.random() * (radius * radius - minRadius * minRadius));
        x = Math.sin(a) * r;
        z = Math.cos(a) * r;
      } else {
        x = (Math.random() - 0.5) * w;
        z = (Math.random() - 0.5) * d;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = 0.2 + Math.random() * (h - 0.4);
      pos[i * 3 + 2] = z;
      seeds[i * 3] = Math.random() * 100;
      seeds[i * 3 + 1] = 0.02 + Math.random() * 0.05;
      seeds[i * 3 + 2] = Math.random() * 100;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geom, seeds, map: dotTexture() };
  }, [w, d, h, radius, minRadius, count]);

  useFrame(({ clock }, dt) => {
    if (still || !pts.current) return;
    const t = clock.elapsedTime;
    const a = geom.attributes.position;
    const arr = a.array;
    const top = h - 0.2;
    for (let i = 0; i < count; i++) {
      const s0 = seeds[i * 3], rise = seeds[i * 3 + 1], s2 = seeds[i * 3 + 2];
      arr[i * 3] += Math.sin(t * 0.21 + s0) * 0.0016;
      arr[i * 3 + 1] += rise * dt * 0.35;
      arr[i * 3 + 2] += Math.cos(t * 0.17 + s2) * 0.0016;
      if (arr[i * 3 + 1] > top) arr[i * 3 + 1] = 0.2;
    }
    a.needsUpdate = true;
  });

  return (
    <points ref={pts} geometry={geom} position={center} raycast={() => null} frustumCulled={false} userData={{ noHighlight: true }}>
      <pointsMaterial
        map={map}
        color={color}
        size={size}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** Off on the "low" graphics setting. */
export function Dust(props) {
  const on = useQuality().dust ?? true;
  return on ? <DustField {...props} /> : null;
}
