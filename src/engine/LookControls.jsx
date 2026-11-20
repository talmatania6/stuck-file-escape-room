import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, useUI } from '../game/store';

/** Shared flag so a mouse drag (looking around) is never treated as a click on an object. */
export const drag = { moved: false };

const PITCH_LIMIT = THREE.MathUtils.degToRad(80);

function lookAngles(pos, look) {
  const dx = look[0] - pos[0];
  const dy = look[1] - pos[1];
  const dz = look[2] - pos[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/**
 * First-person 360° look: drag to turn (full circle, up and down), arrow keys too.
 * The camera glides between "standpoints" defined per scene; `useUI.lookAt(p)`
 * turns the view toward a point (used by "find the active door").
 */
export function LookControls({ standpoints, initial = 'center' }) {
  const { camera, gl } = useThree();
  const events = useThree((s) => s.events);
  const standpoint = useUI((s) => s.standpoint);
  const lookTarget = useUI((s) => s.lookTarget);
  const state = useRef({ yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, down: false, lx: 0, ly: 0, sx: 0, sy: 0 });
  const targetPos = useRef(new THREE.Vector3());
  const first = useRef(true);
  const frame = useRef(0);

  const aim = (pos, look) => {
    const { yaw, pitch } = lookAngles(pos, look);
    const s = state.current;
    let delta = yaw - s.tYaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    s.tYaw += delta;
    s.tPitch = pitch;
  };

  useEffect(() => {
    const sp = standpoints[standpoint] || standpoints[initial] || standpoints.center;
    targetPos.current.set(...sp.pos);
    aim(sp.pos, sp.look);
    if (first.current) {
      first.current = false;
      camera.position.copy(targetPos.current);
      state.current.yaw = state.current.tYaw;
      state.current.pitch = state.current.tPitch;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standpoint, standpoints, camera]);

  const mountedAt = useRef(Date.now());
  useEffect(() => {
    // ignore a "look at" request left over from the previous scene
    if (lookTarget && lookTarget.key >= mountedAt.current) aim(targetPos.current.toArray(), lookTarget.p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookTarget]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = 'grab';
    const s = state.current;
    const onDown = (e) => {
      s.down = true;
      s.lx = s.sx = e.clientX;
      s.ly = s.sy = e.clientY;
      drag.moved = false;
    };
    const onMove = (e) => {
      if (!s.down) return;
      const dx = e.clientX - s.lx;
      const dy = e.clientY - s.ly;
      s.lx = e.clientX;
      s.ly = e.clientY;
      if (!drag.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > 6) {
        drag.moved = true;
        el.style.cursor = 'grabbing';
        const ui = useUI.getState();
        if (ui.tutorialStep === 0) ui.setTutorialStep(1);
      }
      if (drag.moved) {
        s.tYaw += dx * 0.0045;
        s.tPitch = THREE.MathUtils.clamp(s.tPitch + dy * 0.0045, -PITCH_LIMIT, PITCH_LIMIT);
      }
    };
    const onUp = () => {
      s.down = false;
      if (el.style.cursor === 'grabbing') el.style.cursor = 'grab';
    };
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (useUI.getState().overlay) return;
      const step = 0.3;
      if (e.key === 'ArrowLeft') s.tYaw += step;
      else if (e.key === 'ArrowRight') s.tYaw -= step;
      else if (e.key === 'ArrowUp') s.tPitch = Math.min(PITCH_LIMIT, s.tPitch + step);
      else if (e.key === 'ArrowDown') s.tPitch = Math.max(-PITCH_LIMIT, s.tPitch - step);
      else return;
      e.preventDefault();
      const ui = useUI.getState();
      if (ui.tutorialStep === 0) ui.setTutorialStep(1);
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = state.current;
    const calm = useGame.getState().reduceMotion;
    const k = calm ? 1 : 1 - Math.exp(-dt * 7);
    s.yaw += (s.tYaw - s.yaw) * k;
    s.pitch += (s.tPitch - s.pitch) * k;
    camera.position.lerp(targetPos.current, calm ? 1 : 1 - Math.exp(-dt * 2.4));
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    // the view moves under a still mouse – re-check what the pointer is over
    if (++frame.current % 6 === 0 && (Math.abs(s.tYaw - s.yaw) > 0.002 || camera.position.distanceTo(targetPos.current) > 0.01)) {
      events.update?.();
    }
  });

  return null;
}
