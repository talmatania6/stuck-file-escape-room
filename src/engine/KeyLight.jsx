// One shadow-casting "key light" per space: a ceiling fixture, a soft spot light with
// PCF shadows, and a faint volumetric shaft that the dust drifts through.
// Shadows are what make objects sit on the floor instead of floating above it.
//
// Casters are found automatically: every opaque mesh in the scene casts and receives,
// except glow/transparent surfaces, things hung near the ceiling (they'd blot out the
// light), and anything tagged userData.noShadow.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettings, QUALITY } from '../game/settings';

const box = new THREE.Box3();

function tagCasters(scene, ceilingY) {
  scene.traverse((o) => {
    if (!o.isMesh || o.userData._shadowTagged) return;
    o.userData._shadowTagged = true;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || o.userData.noShadow || o.isSkinnedMesh) return;
    const glow = m.transparent || m.blending === THREE.AdditiveBlending || m.type === 'MeshBasicMaterial' || m.type === 'ShaderMaterial' || m.type === 'PointsMaterial' || m.colorWrite === false;
    if (glow) return;
    o.receiveShadow = true;
    box.setFromObject(o);
    const big = box.max.x - box.min.x > 5 || box.max.z - box.min.z > 5; // walls / floor / ceiling
    if (!big && box.min.y < ceilingY - 0.5) o.castShadow = true;
  });
}

function shaftMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: 0.16 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main() {
        vH = uv.y;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vN = normalize(normalMatrix * normal);
        vec4 mv = viewMatrix * wp;
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength; uniform float uTime;
      varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);   // soft sides
        float fall = mix(0.22, 1.0, pow(vH, 1.4));                         // brightest at the fixture
        float floorFade = smoothstep(0.0, 0.08, vH);                       // no hard line on the floor
        float drift = 0.85 + 0.15 * sin(vW.y * 3.0 + vW.x * 2.0 - uTime * 0.4);
        float a = edge * fall * floorFade * drift * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * @param position  fixture position (just under the ceiling)
 * @param target    where the light points
 * @param ceiling   ceiling height – meshes hung above ceiling-0.5 don't cast
 * @param fixture   draw the ceiling lamp housing
 * @param shaft     draw the light shaft
 */
export function KeyLight({
  position = [0.4, 3.3, 0.6],
  target = [0, 0.4, -1.2],
  ceiling = 3.6,
  color = '#fff1e2',
  intensity = 22,
  angle = 0.95,
  fixture = true,
  shaft = true,
  shaftColor,
}) {
  const quality = useSettings((s) => s.quality);
  const q = QUALITY[quality] || QUALITY.high;
  const mapSize = q.shadows || 0;
  const { scene, gl } = useThree();
  const light = useRef();
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const shaftMat = useMemo(() => shaftMaterial(shaftColor || color), [shaftColor, color]);
  const since = useRef(0);

  // geometry of the shaft: a cone from the fixture to the floor along the light direction
  const shaftGeo = useMemo(() => {
    const from = new THREE.Vector3(...position);
    const to = new THREE.Vector3(...target);
    const dir = to.clone().sub(from).normalize();
    const len = Math.max(0.5, (from.y - 0.05) / Math.max(0.2, -dir.y));
    const top = 0.22;
    const bottom = top + Math.tan(angle * 0.42) * len;
    const g = new THREE.CylinderGeometry(top, bottom, len, 40, 1, true);
    g.translate(0, -len / 2, 0); // hang from the fixture
    return { g, dir };
  }, [position, target, angle]);
  const shaftQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), shaftGeo.dir), [shaftGeo]);

  useEffect(() => {
    tgt.position.set(...target);
    scene.add(tgt);
    if (light.current) light.current.target = tgt;
    return () => scene.remove(tgt);
  }, [scene, tgt, target]);

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    // materials compiled before shadows were on need a recompile
    scene.traverse((o) => { if (o.isMesh && o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  }, [gl, scene]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.castShadow = mapSize > 0;
    if (mapSize) {
      l.shadow.mapSize.set(mapSize, mapSize);
      l.shadow.map?.dispose();
      l.shadow.map = null;
      l.shadow.bias = -0.00025;
      l.shadow.normalBias = 0.025;
      l.shadow.radius = 4;
      l.shadow.camera.near = 0.3;
      l.shadow.camera.far = 14;
    }
  }, [mapSize]);

  useFrame(({ clock }, dt) => {
    shaftMat.uniforms.uTime.value = clock.elapsedTime;
    // rooms build their props over the first seconds (and swap some later), so re-tag now and then
    since.current -= dt;
    if (since.current <= 0) {
      tagCasters(scene, ceiling);
      since.current = clock.elapsedTime < 6 ? 0.5 : 3;
    }
  });

  return (
    <group>
      <spotLight
        ref={light}
        position={position}
        color={color}
        intensity={intensity}
        angle={angle}
        penumbra={0.85}
        decay={2}
        distance={0}
      />
      {fixture && (
        <group position={position} quaternion={shaftQuat}>
          {/* housing */}
          <mesh position={[0, 0.07, 0]} userData={{ noHighlight: true, noShadow: true }} raycast={() => null}>
            <cylinderGeometry args={[0.3, 0.34, 0.12, 40]} />
            <meshStandardMaterial color="#1c1f23" metalness={0.85} roughness={0.35} />
          </mesh>
          {/* diffuser */}
          <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ noHighlight: true, noShadow: true }} raycast={() => null}>
            <circleGeometry args={[0.26, 40]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      )}
      {shaft && quality !== 'low' && (
        <mesh geometry={shaftGeo.g} material={shaftMat} position={position} quaternion={shaftQuat} raycast={() => null} userData={{ noHighlight: true, noShadow: true }} renderOrder={5} />
      )}
    </group>
  );
}
