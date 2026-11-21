// Cinematic post-processing shared by every scene: soft bloom on lights and screens,
// a gentle vignette and a subtle colour grade. Uses only three.js' own passes – no extra packages.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSettings, QUALITY } from '../game/settings';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.14 },
    uGrain: { value: 0.018 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    varying vec2 vUv;
    float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // vignette – soft, ~10% at the corners, pulls the eye to the centre
      vec2 d = (vUv - 0.5) * vec2(1.1, 1.0);
      float v = smoothstep(0.85, 0.3, length(d));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      // split tone: cool shadows, slightly warm highlights
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb += (1.0 - l) * vec3(-0.006, 0.004, 0.016) + l * vec3(0.014, 0.004, -0.010);
      // gentle contrast curve
      c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.18);
      // very fine film grain (also hides gradient banding in dark areas)
      c.rgb += (rand(vUv * vec2(1733.0, 977.0) + uTime) - 0.5) * uGrain;
      gl_FragColor = c;
    }
  `,
};

/**
 * Drop inside any <Canvas>. Takes over rendering (useFrame priority 1).
 * strength/radius/threshold tune the bloom; threshold is in linear HDR units,
 * so only emissive lights and screens (intensity > ~1) glow.
 */
function PostFXPipeline({ strength = 0.45, radius = 0.25, threshold = 1.0, vignette = 0.14 }) {
  const { gl, scene, camera, size } = useThree();

  const { composer, bloom, grade } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: gl.capabilities.isWebGL2 ? 4 : 0,
    });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    return { composer, bloom, grade };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    bloom.strength = strength;
    bloom.radius = radius;
    bloom.threshold = threshold;
    grade.uniforms.uVignette.value = vignette;
  }, [bloom, grade, strength, radius, threshold, vignette]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);

  useEffect(() => () => composer.dispose(), [composer]);

  // grain stays static (no crawling noise); the composer simply takes over rendering
  useFrame((_, dt) => composer.render(dt), 1);

  return null;
}

/** Drop inside any <Canvas>. Off on the "low" graphics setting (the plain renderer takes over). */
export function PostFX(props) {
  const bloom = QUALITY[useSettings((s) => s.quality)]?.bloom ?? true;
  return bloom ? <PostFXPipeline {...props} /> : null;
}
