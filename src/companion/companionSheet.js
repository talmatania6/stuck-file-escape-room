import * as THREE from 'three';

// Order of the six panels on the team's character sheet, left to right.
export const ANGLE = { FRONT: 0, LEFT_34: 1, LEFT_PROFILE: 2, BACK: 3, RIGHT_PROFILE: 4, RIGHT_34: 5 };

const CANDIDATES = ['companion/sheet.png', 'companion/sheet.jpg', 'companion/sheet.jpeg', 'companion/sheet.webp'];
// The labels (FRONT, LEFT 3/4 …) sit in the bottom ~9% of the sheet; crop them off.
const CROP_TOP = 0.015;
const CROP_BOTTOM = 0.905;

let promise = null;

function tryLoad(i, resolve) {
  if (i >= CANDIDATES.length) {
    console.info('[companion] No sheet found in public/companion/ – showing an outline stand-in.');
    resolve(null);
    return;
  }
  const img = new Image();
  img.onload = () => resolve(slice(img));
  img.onerror = () => tryLoad(i + 1, resolve);
  img.src = CANDIDATES[i];
}

function slice(img) {
  const cols = 6;
  const cw = img.width / cols;
  const top = img.height * CROP_TOP;
  const h = img.height * (CROP_BOTTOM - CROP_TOP);
  const slices = [];
  for (let i = 0; i < cols; i++) {
    const c = document.createElement('canvas');
    c.width = Math.round(cw);
    c.height = Math.round(h);
    c.getContext('2d').drawImage(img, i * cw, top, cw, h, 0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    slices.push(t);
  }
  return { slices, aspect: cw / h };
}

/** Loads public/companion/sheet.(png|jpg|webp) once and cuts it into the six angle textures. */
export function loadCompanionSheet() {
  if (!promise) promise = new Promise((resolve) => tryLoad(0, resolve));
  return promise;
}

let portrait = null;
/** Ping's face for the speech bubble / HUD: head-and-shoulders from the cleaned front view. */
export async function companionPortrait() {
  return `${import.meta.env.BASE_URL}assets/ping/ping-portrait.webp`;
}
