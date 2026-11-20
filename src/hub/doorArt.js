import * as THREE from 'three';

// Door faces for the hub. Each door carries its layer number and English name as
// part of the door itself, plus a line-drawn motif hinting at what the layer does.

export const LAYERS = [
  { n: 1, en: 'PHYSICAL', accent: '#d08a4c' },
  { n: 2, en: 'DATA LINK', accent: '#86a4c0' },
  { n: 3, en: 'NETWORK', accent: '#5fae8e' },
  { n: 4, en: 'TRANSPORT', accent: '#cf7b42' },
  { n: 5, en: 'SESSION', accent: '#c08a62' },
  { n: 6, en: 'PRESENTATION', accent: '#a882c9' },
  { n: 7, en: 'APPLICATION', accent: '#d9b25f' },
];

const STATE_STYLE = {
  locked: { num: '#9aa5b1', label: 'נעול', band: '#3a3022', bandText: '#FFB547' },
  active: { num: '#ffffff', label: 'פתוח · היכנסו', band: '#0f3a40', bandText: '#7fe6f0' },
  done: { num: '#9fe7cf', label: 'תוקן', band: '#123a2e', bandText: '#65CDAA' },
};

function motif(g, n, x, y, w, h, color) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const cx = x + w / 2, cy = y + h / 2;
  if (n === 1) {
    // plug + square-wave signal
    g.strokeRect(cx - 40, y + 20, 80, 70);
    g.beginPath(); g.moveTo(cx - 18, y + 20); g.lineTo(cx - 18, y - 6); g.moveTo(cx + 18, y + 20); g.lineTo(cx + 18, y - 6); g.stroke();
    g.beginPath(); g.moveTo(cx, y + 90); g.bezierCurveTo(cx, y + 140, cx - 120, y + 120, cx - 140, y + 170); g.stroke();
    g.beginPath();
    let px = x + 20; const base = y + 260, top = y + 200;
    g.moveTo(px, base);
    [1, 0, 1, 1, 0, 0, 1, 0].forEach((b) => {
      const len = b ? 52 : 20;
      g.lineTo(px, top); g.lineTo(px + len, top); g.lineTo(px + len, base); px += len + 14; g.lineTo(px, base);
    });
    g.stroke();
  } else if (n === 2) {
    // a chain of frames: header | payload | trailer, and a MAC address
    for (let i = 0; i < 3; i++) {
      const fy = y + 20 + i * 78;
      g.globalAlpha = 1 - i * 0.25;
      g.strokeRect(x + 30, fy, w - 60, 56);
      g.beginPath(); g.moveTo(x + 120, fy); g.lineTo(x + 120, fy + 56); g.moveTo(x + w - 110, fy); g.lineTo(x + w - 110, fy + 56); g.stroke();
    }
    g.globalAlpha = 1;
    g.font = '500 30px "Courier New", monospace';
    g.textAlign = 'center';
    g.fillText('F0:18:98:4D:7A:02', cx, y + 285);
  } else if (n === 3) {
    // nodes and routes
    const pts = [[x + 50, y + 60], [x + 170, y + 30], [x + 300, y + 90], [x + 110, y + 180], [x + 250, y + 220], [x + 380, y + 170]];
    const links = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [1, 4]];
    g.lineWidth = 3;
    g.globalAlpha = 0.6;
    links.forEach(([a, b]) => { g.beginPath(); g.moveTo(...pts[a]); g.lineTo(...pts[b]); g.stroke(); });
    g.globalAlpha = 1;
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[3]); g.lineTo(...pts[4]); g.lineTo(...pts[5]); g.stroke();
    pts.forEach(([px, py]) => { g.beginPath(); g.arc(px, py, 13, 0, Math.PI * 2); g.fill(); });
  } else if (n === 4) {
    // numbered segments on a conveyor
    g.font = '700 40px Rubik, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [1, 2, 3, 4].forEach((k, i) => {
      const bx = x + 20 + i * 98, by = y + 90;
      g.strokeRect(bx, by, 80, 80);
      g.fillText(String(k), bx + 40, by + 42);
    });
    g.beginPath(); g.moveTo(x + 10, y + 200); g.lineTo(x + w - 10, y + 200); g.stroke();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + 30 + i * 46, y + 216, 10, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(x + w - 70, y + 260); g.lineTo(x + w - 20, y + 260); g.lineTo(x + w - 40, y + 245); g.moveTo(x + w - 20, y + 260); g.lineTo(x + w - 40, y + 275); g.stroke();
  } else if (n === 5) {
    // two endpoints, a held connection
    g.strokeRect(x + 20, y + 90, 90, 110);
    g.strokeRect(x + w - 110, y + 90, 90, 110);
    g.setLineDash([14, 12]);
    g.beginPath(); g.moveTo(x + 110, y + 125); g.bezierCurveTo(cx - 40, y + 20, cx + 40, y + 20, x + w - 110, y + 125); g.stroke();
    g.beginPath(); g.moveTo(x + 110, y + 165); g.bezierCurveTo(cx - 40, y + 270, cx + 40, y + 270, x + w - 110, y + 165); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.arc(cx, y + 145, 16, 0, Math.PI * 2); g.fill();
  } else if (n === 6) {
    // cipher wheel
    g.beginPath(); g.arc(cx, cy, 140, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, 92, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
    g.font = '700 28px Rubik, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const outer = ['A', '▲', 'B', '●', 'C', '■', 'D', '◆'];
    outer.forEach((s, i) => {
      const a = (i / outer.length) * Math.PI * 2;
      g.fillText(s, cx + Math.cos(a) * 116, cy + Math.sin(a) * 116);
      g.beginPath(); g.moveTo(cx + Math.cos(a + 0.39) * 92, cy + Math.sin(a + 0.39) * 92); g.lineTo(cx + Math.cos(a + 0.39) * 140, cy + Math.sin(a + 0.39) * 140); g.stroke();
    });
  } else if (n === 7) {
    // a service terminal with request lines + envelope
    g.strokeRect(x + 30, y + 20, w - 60, 200);
    g.beginPath(); g.moveTo(x + 30, y + 60); g.lineTo(x + w - 30, y + 60); g.stroke();
    [0, 1, 2].forEach((i) => { g.beginPath(); g.arc(x + w - 60 - i * 26, y + 40, 6, 0, Math.PI * 2); g.fill(); });
    g.font = '500 28px "Courier New", monospace';
    g.textAlign = 'left';
    ['GET /course', 'MAIL FROM:', 'STOR file.pdf'].forEach((t, i) => g.fillText(t, x + 50, y + 100 + i * 40));
    g.strokeRect(cx - 50, y + 240, 100, 60);
    g.beginPath(); g.moveTo(cx - 50, y + 240); g.lineTo(cx, y + 275); g.lineTo(cx + 50, y + 240); g.stroke();
  }
  g.restore();
}

/** Full door face as a canvas texture (512 x 1024). */
export function doorTexture(layer, state) {
  const st = STATE_STYLE[state];
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const g = c.getContext('2d');
  // brushed charcoal metal
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#1d2126');
  grad.addColorStop(0.5, '#2a2f35');
  grad.addColorStop(1, '#1d2126');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 700; i++) {
    g.strokeStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    const yy = Math.random() * 1024;
    g.beginPath(); g.moveTo(0, yy); g.lineTo(512, yy); g.stroke();
  }
  // centre seam where the leaves meet
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(254, 0, 4, 1024);
  // number plate
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(36, 40, 440, 300);
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 2;
  g.strokeRect(36, 40, 440, 300);
  g.fillStyle = layer.accent;
  g.fillRect(36, 40, 440, 8);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#c9d2da';
  g.font = '500 44px Rubik, sans-serif';
  g.fillText('L A Y E R', 256, 112);
  g.fillStyle = st.num;
  g.font = '700 190px Rubik, sans-serif';
  g.fillText(String(layer.n).padStart(2, '0'), 256, 290);
  // name
  g.fillStyle = state === 'locked' ? '#b9c3cc' : '#ffffff';
  let size = 66;
  g.font = `700 ${size}px Rubik, sans-serif`;
  while (g.measureText(layer.en).width > 440 && size > 30) {
    size -= 2;
    g.font = `700 ${size}px Rubik, sans-serif`;
  }
  g.fillText(layer.en, 256, 420);
  g.fillStyle = layer.accent;
  g.fillRect(206, 444, 100, 5);
  // motif
  motif(g, layer.n, 36, 500, 440, 300, state === 'locked' ? 'rgba(180,190,200,0.55)' : layer.accent);
  // status band
  g.fillStyle = st.band;
  g.fillRect(36, 880, 440, 84);
  g.fillStyle = st.bandText;
  g.font = '700 44px Heebo, sans-serif';
  g.direction = 'rtl';
  g.fillText(st.label, 256, 938);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Splits a door texture into the two sliding leaves. */
export function leafTextures(tex) {
  const l = tex.clone();
  const r = tex.clone();
  l.repeat.set(0.5, 1);
  r.repeat.set(0.5, 1);
  r.offset.set(0.5, 0);
  l.needsUpdate = r.needsUpdate = true;
  return [l, r];
}

/** Rotating status band around the hub's file hologram. */
export function statusBandTexture(solved) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 96;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 2048, 96);
  g.font = '700 40px Rubik, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  LAYERS.forEach((l, i) => {
    const ok = solved.includes(l.n);
    g.fillStyle = ok ? '#9ff0d6' : '#ffbf73';
    g.fillText(`${String(l.n).padStart(2, '0')} ${l.en} · ${ok ? 'ONLINE' : 'OFFLINE'}`, (i + 0.5) * (2048 / 7), 48);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = -1; // read from inside the ring, where the player stands
  return t;
}
