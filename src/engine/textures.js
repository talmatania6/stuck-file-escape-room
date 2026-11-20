// Procedural canvas textures: concrete, brushed metal, wood, hazard stripes and
// Hebrew signage. No image assets are needed to dress a room.
import * as THREE from 'three';

const canvasCache = new Map();

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function toTexture(canvas, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function cached(key, draw) {
  if (!canvasCache.has(key)) canvasCache.set(key, draw());
  return canvasCache.get(key);
}

/** Cast concrete with formwork seams, tie holes, stains. */
export function concrete(repeat = [1, 1], base = '#5d6266', seed = 1) {
  const c = cached(`concrete-${base}-${seed}`, () => {
    const cv = makeCanvas(512, 512);
    const g = cv.getContext('2d');
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) {
      const x = r() * 512, y = r() * 512, rad = 30 + r() * 140;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() > 0.5;
      grad.addColorStop(0, dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 512);
    }
    for (let i = 0; i < 14000; i++) {
      const v = Math.floor(r() * 255);
      g.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.08})`;
      g.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    // formwork seams
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 2;
    [0, 256].forEach((y) => { g.beginPath(); g.moveTo(0, y + 1); g.lineTo(512, y + 1); g.stroke(); });
    g.beginPath(); g.moveTo(1, 0); g.lineTo(1, 512); g.stroke();
    // tie holes
    for (let x = 64; x < 512; x += 128) {
      for (let y = 64; y < 512; y += 128) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.beginPath(); g.arc(x + 1, y + 1, 5, 0, Math.PI); g.fill();
      }
    }
    // water stains running down
    for (let i = 0; i < 6; i++) {
      const x = r() * 512;
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, 'rgba(30,25,20,0.16)');
      grad.addColorStop(1, 'rgba(30,25,20,0)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 6 + r() * 18, 140 + r() * 300);
    }
    return cv;
  });
  return toTexture(c, repeat);
}

/** Brushed / scratched metal. */
export function metal(base = '#4c5a66', seed = 2, repeat = [1, 1]) {
  const c = cached(`metal-${base}-${seed}`, () => {
    const cv = makeCanvas(512, 512);
    const g = cv.getContext('2d');
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      const v = r() > 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},${v},${v},${0.02 + r() * 0.04})`;
      g.lineWidth = 1;
      const y = r() * 512;
      g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (r() - 0.5) * 4); g.stroke();
    }
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.1})`;
      const x = r() * 512, y = r() * 512, l = 10 + r() * 50, a = r() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const x = r() * 512, y = r() * 512, rad = 20 + r() * 60;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, 'rgba(60,40,25,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 512);
    }
    return cv;
  });
  return toTexture(c, repeat);
}

export function wood(repeat = [1, 1]) {
  const c = cached('wood', () => {
    const cv = makeCanvas(512, 512);
    const g = cv.getContext('2d');
    const r = rng(9);
    g.fillStyle = '#5a3d28';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? '30,18,10' : '120,85,55'},${0.1 + r() * 0.2})`;
      g.lineWidth = 1 + r() * 2;
      const y = r() * 512;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(170, y + (r() - 0.5) * 20, 340, y + (r() - 0.5) * 20, 512, y + (r() - 0.5) * 10);
      g.stroke();
    }
    return cv;
  });
  return toTexture(c, repeat);
}

export function hazard(repeat = [1, 1]) {
  const c = cached('hazard', () => {
    const cv = makeCanvas(256, 64);
    const g = cv.getContext('2d');
    g.fillStyle = '#1a1a1a';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#d9a33e';
    for (let x = -64; x < 320; x += 48) {
      g.beginPath();
      g.moveTo(x, 64); g.lineTo(x + 24, 64); g.lineTo(x + 88, 0); g.lineTo(x + 64, 0);
      g.closePath(); g.fill();
    }
    return cv;
  });
  return toTexture(c, repeat);
}

export function pegboard(repeat = [1, 1]) {
  const c = cached('pegboard', () => {
    const cv = makeCanvas(256, 256);
    const g = cv.getContext('2d');
    g.fillStyle = '#7b6a55';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(20,14,8,0.85)';
    for (let x = 8; x < 256; x += 16) for (let y = 8; y < 256; y += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
    return cv;
  });
  return toTexture(c, repeat);
}

export function grille() {
  const c = cached('grille', () => {
    const cv = makeCanvas(128, 128);
    const g = cv.getContext('2d');
    g.fillStyle = '#20262c';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#05070a';
    for (let x = 6; x < 128; x += 10) for (let y = 6; y < 128; y += 10) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
    return cv;
  });
  return toTexture(c);
}

/**
 * Hebrew sign. `lines`: [{ text, size, color, weight, font, dir }]
 * Text is drawn right-aligned (RTL) unless a line sets dir:'ltr'.
 */
export function sign({ w = 512, h = 256, bg = '#1b232b', border, lines = [], pad = 28, align = 'right', icon, aged = true }) {
  const cv = makeCanvas(w, h);
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (border) {
    g.strokeStyle = border;
    g.lineWidth = Math.max(4, w / 80);
    g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
  }
  if (icon) icon(g, w, h);
  let y = pad;
  for (const l of lines) {
    const size = l.size || 36;
    g.font = `${l.weight || 700} ${size}px ${l.font || 'Heebo'}, sans-serif`;
    g.fillStyle = l.color || '#DDE8EF';
    g.direction = l.dir || 'rtl';
    const a = l.align || align;
    g.textAlign = a === 'center' ? 'center' : l.dir === 'ltr' ? 'left' : 'right';
    g.textBaseline = 'top';
    const x = a === 'center' ? w / 2 : l.dir === 'ltr' ? pad : w - pad;
    y += l.gap || 0;
    g.fillText(l.text, x, y);
    y += size * 1.35;
  }
  if (aged) {
    const r = rng(w + h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Architectural wall panels: a grid of plates with seams, bevel highlights and fasteners. */
export function panels(base = '#4b5560', seed = 3, { cols = 2, rows = 3, repeat = [1, 1], grime = 0.5 } = {}) {
  const c = cached(`panels-${base}-${seed}-${cols}-${rows}`, () => {
    const cv = makeCanvas(512, 512);
    const g = cv.getContext('2d');
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    const pw = 512 / cols, ph = 512 / rows;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const px = x * pw, py = y * ph;
        const grad = g.createLinearGradient(px, py, px, py + ph);
        grad.addColorStop(0, 'rgba(255,255,255,0.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0.10)');
        g.fillStyle = grad;
        g.fillRect(px + 4, py + 4, pw - 8, ph - 8);
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 4;
        g.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
        g.strokeStyle = 'rgba(255,255,255,0.10)';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(px + 6, py + ph - 6); g.lineTo(px + 6, py + 6); g.lineTo(px + pw - 6, py + 6); g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.45)';
        [[14, 14], [pw - 14, 14], [14, ph - 14], [pw - 14, ph - 14]].forEach(([fx, fy]) => { g.beginPath(); g.arc(px + fx, py + fy, 3, 0, Math.PI * 2); g.fill(); });
      }
    }
    for (let i = 0; i < 5000; i++) {
      const v = r() > 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${r() * 0.035})`;
      g.fillRect(r() * 512, r() * 512, 1.5, 1.5);
    }
    for (let i = 0; i < 8 * grime; i++) {
      const x = r() * 512, y = r() * 512, rad = 20 + r() * 80;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, 'rgba(20,16,12,0.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 512);
    }
    return cv;
  });
  return toTexture(c, repeat);
}

/** Floor tiles – polished stone or rubber matting. */
export function tiles(base = '#2b2f34', seed = 4, { n = 4, repeat = [1, 1], seam = 'rgba(0,0,0,0.5)' } = {}) {
  const c = cached(`tiles-${base}-${seed}-${n}`, () => {
    const cv = makeCanvas(512, 512);
    const g = cv.getContext('2d');
    const r = rng(seed);
    const s = 512 / n;
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        g.fillStyle = base;
        g.fillRect(x * s, y * s, s, s);
        g.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
        g.fillRect(x * s, y * s, s, s);
        for (let i = 0; i < 60; i++) {
          g.strokeStyle = `rgba(255,255,255,${r() * 0.04})`;
          const sx = x * s + r() * s, sy = y * s + r() * s;
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (r() - 0.5) * 40, sy + (r() - 0.5) * 10); g.stroke();
        }
      }
    }
    g.strokeStyle = seam;
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke();
    }
    return cv;
  });
  return toTexture(c, repeat);
}

/** Warning triangle with a lightning bolt, drawn into a sign. */
export function lightningIcon(cx, cy, size) {
  return (g) => {
    g.save();
    g.translate(cx, cy);
    g.fillStyle = '#111';
    g.beginPath();
    g.moveTo(0, -size); g.lineTo(size * 0.95, size * 0.7); g.lineTo(-size * 0.95, size * 0.7);
    g.closePath(); g.fill();
    g.fillStyle = '#FFB547';
    g.beginPath();
    g.moveTo(0, -size * 0.72); g.lineTo(size * 0.72, size * 0.55); g.lineTo(-size * 0.72, size * 0.55);
    g.closePath(); g.fill();
    g.fillStyle = '#111';
    g.beginPath();
    g.moveTo(size * 0.08, -size * 0.45);
    g.lineTo(-size * 0.22, size * 0.08);
    g.lineTo(0, size * 0.08);
    g.lineTo(-size * 0.1, size * 0.45);
    g.lineTo(size * 0.24, -size * 0.06);
    g.lineTo(size * 0.02, -size * 0.06);
    g.closePath(); g.fill();
    g.restore();
  };
}
