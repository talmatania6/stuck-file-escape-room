// Image-based lighting: a real HDRI (CC0, Poly Haven) lights and reflects off every
// standard material, so metal and polished floors pick up believable highlights.
// The background colour of each scene is untouched – only lighting/reflections change.
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const BASE = import.meta.env.BASE_URL;
const cache = new Map(); // file -> Promise<Texture>

function loadHDR(file) {
  if (!cache.has(file)) {
    cache.set(
      file,
      new Promise((resolve, reject) => {
        new EXRLoader().load(`${BASE}assets/hdri/${file}`, (t) => {
          t.mapping = THREE.EquirectangularReflectionMapping;
          resolve(t);
        }, undefined, reject);
      }),
    );
  }
  return cache.get(file);
}

export function SceneEnvironment({ file = 'warehouse.exr', intensity = 0.45, rotation = 0 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    let alive = true;
    let env = null;
    const pmrem = new THREE.PMREMGenerator(gl);
    loadHDR(file)
      .then((tex) => {
        if (!alive) return;
        env = pmrem.fromEquirectangular(tex).texture;
        scene.environment = env;
        scene.environmentIntensity = intensity;
        if (scene.environmentRotation) scene.environmentRotation.set(0, rotation, 0);
      })
      .catch(() => {
        /* no HDRI – the scene simply keeps its own lights */
      });
    return () => {
      alive = false;
      if (scene.environment === env) scene.environment = null;
      env?.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, file, intensity, rotation]);
  return null;
}
