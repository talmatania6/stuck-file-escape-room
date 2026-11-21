import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useUI } from '../game/store';
import { drag } from './LookControls';

const HIGHLIGHT = '#3FD0E0';
const REACH = 4.2; // metres – how close you must be to use an object in FPS mode

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
        m.emissiveIntensity = 0.09;
      } else {
        m.emissive.copy(o.userData._base.c);
        m.emissiveIntensity = o.userData._base.i;
      }
    });
  }, [hover, enabled]);

  useEffect(() => () => setHovered(null), [setHovered]);

  return (
    <group
      ref={ref}
      {...props}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!enabled) return;
        setHover(true);
        setHovered(label);
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(false);
        setHovered(null);
        gl.domElement.style.cursor = 'grab';
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!enabled || drag.moved) return;
        if (document.pointerLockElement) {
          // FPS mode: the player walks on their own – never pull the camera; just need to be close enough
          if (e.distance > REACH) {
            setHovered(`${label} · קרבו כדי להפעיל`);
            return;
          }
        } else if (standpoint) setStandpoint(standpoint);
        const ui = useUI.getState();
        if (ui.tutorialStep === 1) ui.setTutorialStep(2);
        onActivate?.();
      }}
    >
      {children}
    </group>
  );
}
