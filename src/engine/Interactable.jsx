import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useUI } from '../game/store';
import { drag } from './LookControls';
import { useKeyAction } from './KeyAction';

const HIGHLIGHT = '#3FD0E0';
const REACH = 4.2; // metres – how close you must be to use an object in FPS mode

/** What the post-processing outline should trace right now (the hovered object's visible meshes). */
export const hoverOutline = { objects: [] };

function isInside(o, root) {
  for (let p = o; p; p = p.parent) if (p === root) return true;
  return false;
}

function outlineMeshes(root) {
  const out = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.noHighlight && o.visible && o.material && o.material.colorWrite !== false && !o.material.transparent) out.push(o);
  });
  return out;
}

/**
 * Wraps any 3D object so it can be explored: a soft turquoise glow on hover,
 * a pointer cursor, a short label, and on click it walks the camera to its
 * standpoint (if given) and runs onActivate.
 */
export function Interactable({ label, onActivate, standpoint, enabled = true, children, ...props }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  const { gl } = useThree();
  const setHovered = useUI((s) => s.setHovered);
  const setStandpoint = useUI((s) => s.setStandpoint);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.traverse((o) => {
      if (!o.isMesh || o.userData.noHighlight) return;
      const m = o.material;
      if (!m || !m.emissive) return;
      if (!o.userData._base) o.userData._base = { c: m.emissive.clone(), i: m.emissiveIntensity };
      if (hover && enabled) {
        m.emissive.set(HIGHLIGHT);
        m.emissiveIntensity = 0.05;
      } else {
        m.emissive.copy(o.userData._base.c);
        m.emissiveIntensity = o.userData._base.i;
      }
    });
    hoverOutline.objects = hover && enabled ? outlineMeshes(ref.current) : hoverOutline.objects.filter((o) => !isInside(o, ref.current));
  }, [hover, enabled]);

  useEffect(() => () => { if (ref.current) hoverOutline.objects = hoverOutline.objects.filter((o) => !isInside(o, ref.current)); }, []);

  useEffect(() => () => setHovered(null), [setHovered]);
  useEffect(() => () => { const k = useKeyAction.getState(); if (k.hover?.label === label) k.setHover(null); }, [label]);

  const lastDistance = useRef(0);
  /** Click or E/Enter: the same action. */
  const activate = (distance) => {
    if (!enabled) return;
    if (document.pointerLockElement) {
      // FPS mode: the player walks on their own – never pull the camera; just need to be close enough
      if (distance > REACH) {
        setHovered(`${label} · קרבו כדי להפעיל`);
        return;
      }
    } else if (standpoint) setStandpoint(standpoint);
    const ui = useUI.getState();
    if (ui.tutorialStep === 1) ui.setTutorialStep(2);
    onActivate?.();
  };

  return (
    <group
      ref={ref}
      {...props}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!enabled) return;
        setHover(true);
        setHovered(label);
        lastDistance.current = e.distance;
        useKeyAction.getState().setHover({ label, run: () => activate(lastDistance.current) });
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerMove={(e) => { lastDistance.current = e.distance; }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(false);
        setHovered(null);
        const k = useKeyAction.getState();
        if (k.hover?.label === label) k.setHover(null);
        gl.domElement.style.cursor = 'grab';
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!enabled || drag.moved) return;
        activate(e.distance);
      }}
    >
      {children}
    </group>
  );
}
