// Tileable normal maps (CC0) – surface relief that catches the light: brushed metal,
// diamond plate, grooves, fine grain. One texture per (map, repeat) pair, cached.
import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;
const loader = new THREE.TextureLoader();
const cache = new Map();
/** Maps generated for this project (assets/pbr): concrete, floor-wear, painted relief + grunge roughness. */
const PBR_SET = new Set(['concrete', 'floor-wear', 'painted', 'grunge-rough']);

/** names: brushed · brushed-fine · diamond-plate · grooves · fine · tiles · scratched */
export function normalTex(name, repeat = [1, 1]) {
  const key = `${name}:${repeat.join('x')}`;
  if (!cache.has(key)) {
    const dir = PBR_SET.has(name) ? 'pbr' : 'normals';
    const t = loader.load(`${BASE}assets/${dir}/${name}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    t.repeat.set(repeat[0], repeat[1]);
    cache.set(key, t);
  }
  return cache.get(key);
}

/** Convenience: props for a <meshStandardMaterial> – normalMap + normalScale. */
export function relief(name, repeat, strength = 0.6) {
  return { normalMap: normalTex(name, repeat), normalScale: new THREE.Vector2(strength, strength) };
}

/** Roughness variation (stains, smudges, scratches) – multiplies a material's roughness. */
export function grunge(repeat = [1, 1]) {
  return normalTex('grunge-rough', repeat);
}
