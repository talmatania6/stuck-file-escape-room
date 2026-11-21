import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { events as defaultEvents } from '@react-three/fiber';
import { useGame, useUI } from '../game/store';
import { useSettings, usePointer } from '../game/settings';

/** Shared flag so a mouse drag (looking around) is never treated as a click on an object. */
export const drag = { moved: false };

const PITCH_LIMIT = THREE.MathUtils.degToRad(80);

function lookAngles(pos, look) {
  const dx = look[0] - pos[0];
  const dy = look[1] - pos[1];
  const dz = look[2] - pos[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/** Keys held right now (by physical key code, so it works on a Hebrew keyboard too). */
const held = new Set();
const WALK_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const WALK_SPEED = 2.0; // m/s
const MOUSE_K = 0.0022; // radians per pixel of mouse movement at sensitivity 1
const SPIKE = 140; // px in a single event – anything bigger is a browser glitch, not a hand
let lockedAt = 0;

/** Lock the mouse to the view. Raw (unaccelerated) movement where supported – steadier and spike-free. */
function lockMouse(el) {
  const plain = () => {
    try {
      const p = el.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch {
      /* pointer lock unavailable */
    }
  };
  try {
    const p = el.requestPointerLock?.({ unadjustedMovement: true });
    if (p && p.catch) p.catch(plain); // not supported on this OS/browser → normal lock
  } catch {
    plain();
  }
}

/** While the mouse is locked (FPS mode), objects are picked through the crosshair at the centre of the screen. */
export function fpsEvents(store) {
  const base = defaultEvents(store);
  return {
    ...base,
    compute(event, state) {
      if (document.pointerLockElement) {
        state.pointer.set(0, 0);
        state.raycaster.setFromCamera(state.pointer, state.camera);
        return;
      }
      base.compute(event, state);
    },
  };
}
const TURN_SPEED = 1.9; // rad/s

/**
 * First-person 360° look: drag to turn (full circle, up and down).
 * Walk with W/S or ↑/↓, step sideways with A/D, turn with ←/→.
 * `bounds` keeps the player inside the room: { half } for a square room, { radius } for the round hub.
 * The camera glides between "standpoints" defined per scene; `useUI.lookAt(p)`
 * turns the view toward a point (used by "find the active door").
 */
export function LookControls({ standpoints, initial = 'center', bounds = { half: 2.9 } }) {
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
    if (standpoint === 'free') return; // the player is walking – stay where they are
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
      const mode = useSettings.getState().controlMode;
      if (mode === 'mouse') {
        // first click locks the mouse to the view; it should not also "click" an object
        if (document.pointerLockElement !== el) {
          drag.moved = true;
          lockMouse(el);
          s.down = true;
          s.lx = s.sx = e.clientX;
          s.ly = s.sy = e.clientY;
          return;
        }
        // locked: a press that turns into a look-around must not count as a click
        drag.moved = false;
        s.down = true;
        s.acc = 0;
        return;
      }
      s.down = true;
      s.lx = s.sx = e.clientX;
      s.ly = s.sy = e.clientY;
      drag.moved = false;
    };
    const onMove = (e) => {
      if (document.pointerLockElement === el) {
        // Browsers occasionally report a huge bogus jump (common in Chrome on Windows, and right
        // after locking). Drop those events instead of whipping the camera around.
        if (performance.now() - lockedAt < 120) return;
        if (Math.abs(e.movementX) > SPIKE || Math.abs(e.movementY) > SPIKE) return;
        const st = useSettings.getState();
        const k = MOUSE_K * st.sensitivity;
        s.tYaw -= e.movementX * k;
        s.tPitch = THREE.MathUtils.clamp(s.tPitch - e.movementY * k * (st.invertY ? -1 : 1), -PITCH_LIMIT, PITCH_LIMIT);
        if (s.down) {
          s.acc = (s.acc || 0) + Math.abs(e.movementX) + Math.abs(e.movementY);
          if (s.acc > 10) drag.moved = true;
        }
        const ui = useUI.getState();
        if (ui.tutorialStep === 0 && Math.abs(e.movementX) + Math.abs(e.movementY) > 2) ui.setTutorialStep(1);
        return;
      }
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
    const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable;
    const onKey = (e) => {
      if (!WALK_KEYS.has(e.code) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (useUI.getState().overlay) return;
      held.add(e.code);
      e.preventDefault();
      const ui = useUI.getState();
      if (ui.tutorialStep === 0) ui.setTutorialStep(1);
    };
    const onKeyUp = (e) => held.delete(e.code);
    const onBlur = () => held.clear();
    const onLock = () => {
      const locked = document.pointerLockElement === el;
      if (locked) lockedAt = performance.now();
      usePointer.getState().setLocked(locked);
      el.style.cursor = locked ? 'none' : 'grab';
      if (!locked) { s.down = false; held.clear(); }
    };
    document.addEventListener('pointerlockchange', onLock);
    // any panel or puzzle opening hands the mouse back to the player
    const release = () => {
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
    const unsubUI = useUI.subscribe((u) => {
      if (u.overlay || u.helpOpen || u.journalOpen || u.successOpen || u.fading) release();
    });
    const unsubP = usePointer.subscribe((p) => p.settingsOpen && release());
    const unsubS = useSettings.subscribe((st) => st.controlMode !== 'mouse' && release());
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      held.clear();
      document.removeEventListener('pointerlockchange', onLock);
      unsubUI();
      unsubP();
      unsubS();
      release();
      usePointer.getState().setLocked(false);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [gl]);

  const fwd = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());
  const bob = useRef({ phase: 0, amp: 0, applied: 0 });
  useFrame((_, dt) => {
    const s = state.current;
    const calm = useGame.getState().reduceMotion;
    let walking = false;
    // ---- keyboard walking ----
    if (held.size && !useUI.getState().overlay) {
      const d = Math.min(dt, 0.05);
      if (held.has('ArrowLeft')) s.tYaw += TURN_SPEED * d;
      if (held.has('ArrowRight')) s.tYaw -= TURN_SPEED * d;
      const f = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
      const r = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
      if (f || r) {
        fwd.current.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
        side.current.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
        const t = targetPos.current;
        const v = WALK_SPEED * useSettings.getState().walkSpeed * d;
        t.addScaledVector(fwd.current, f * v).addScaledVector(side.current, r * v);
        if (bounds.radius) {
          const len = Math.hypot(t.x, t.z);
          if (len > bounds.radius) { t.x *= bounds.radius / len; t.z *= bounds.radius / len; }
        } else {
          const h = bounds.half ?? 2.9;
          t.x = THREE.MathUtils.clamp(t.x, -h, h);
          t.z = THREE.MathUtils.clamp(t.z, -h, h);
        }
        walking = true;
        bob.current.phase += d * 8.5 * useSettings.getState().walkSpeed;
        camera.position.x = t.x; // walking is direct, no glide lag
        camera.position.z = t.z;
        if (useUI.getState().standpoint !== 'free') useUI.getState().setStandpoint('free');
      }
    }
    const st = useSettings.getState();
    // mouse-look should feel direct; dragging keeps its soft glide
    const k = calm || st.controlMode === 'mouse' ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 7);
    if (camera.fov !== st.fov) {
      camera.fov = st.fov;
      camera.updateProjectionMatrix();
    }
    s.yaw += (s.tYaw - s.yaw) * k;
    s.pitch += (s.tPitch - s.pitch) * k;
    const b = bob.current;
    camera.position.y -= b.applied; // take last frame's step bounce out before easing
    camera.position.lerp(targetPos.current, calm ? 1 : 1 - Math.exp(-dt * 2.4));
    // a gentle head bob while walking (a few cm), fading out when you stop
    b.amp += ((walking && !calm ? 1 : 0) - b.amp) * (1 - Math.exp(-dt * 8));
    b.applied = Math.abs(Math.sin(b.phase)) * 0.028 * b.amp - 0.014 * b.amp;
    camera.position.y += b.applied;
    camera.rotation.set(s.pitch, s.yaw, Math.sin(b.phase) * 0.0035 * b.amp, 'YXZ');
    // the view moves under a still mouse – re-check what the pointer is over
    if (++frame.current % 6 === 0 && (Math.abs(s.tYaw - s.yaw) > 0.002 || camera.position.distanceTo(targetPos.current) > 0.01)) {
      events.update?.();
    }
  });

  return null;
}
