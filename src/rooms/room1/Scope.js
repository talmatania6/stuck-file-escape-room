import * as THREE from 'three';

/**
 * The signal generator's oscilloscope screen. It draws each pulse as it plays,
 * so the length of every signal is also visible – an accessible alternative to
 * listening that shows durations, never the digits themselves.
 */
export class Scope {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 288;
    this.g = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.timeline = null;
    this.total = 1;
    this.t0 = 0;
    this.progress = 0;
    this.playing = false;
    this.draw();
  }

  start({ t0, timeline, total }) {
    this.t0 = t0;
    this.timeline = timeline;
    this.total = total;
    this.progress = 0;
    this.playing = true;
  }

  update(now) {
    if (!this.playing) return;
    this.progress = Math.max(0, now - this.t0);
    if (this.progress >= this.total) {
      this.progress = this.total;
      this.playing = false;
    }
    this.draw();
  }

  draw() {
    const { g } = this;
    const W = 512, H = 288;
    g.fillStyle = '#07130f';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#123629';
    g.lineWidth = 1;
    for (let x = 0; x <= W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.font = '500 20px Heebo, sans-serif';
    g.direction = 'rtl';
    g.textAlign = 'right';
    g.fillStyle = '#5e8f7c';
    g.fillText('ערוץ 1 · אות נכנס', W - 16, 30);

    const base = 214, high = 96, x0 = 24, x1 = W - 24;
    if (!this.timeline) {
      g.strokeStyle = '#FFB547';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(x0, base); g.lineTo(x1, base); g.stroke();
      g.textAlign = 'center';
      g.fillStyle = '#FFB547';
      g.font = '700 26px Heebo, sans-serif';
      g.fillText('לחצו על הכפתור להשמעת האות', W / 2, 150);
    } else {
      const sx = (t) => x0 + (t / this.total) * (x1 - x0);
      g.save();
      g.shadowColor = '#FFB547';
      g.shadowBlur = 14;
      g.strokeStyle = '#FFB547';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x0, base);
      for (const p of this.timeline) {
        if (p.start > this.progress) break;
        const end = Math.min(p.end, this.progress);
        g.lineTo(sx(p.start), base);
        g.lineTo(sx(p.start), high);
        g.lineTo(sx(end), high);
        if (end === p.end) g.lineTo(sx(end), base);
      }
      const last = this.timeline.find((p) => p.start <= this.progress && p.end > this.progress);
      if (!last) g.lineTo(sx(this.progress), base);
      g.stroke();
      g.restore();
      if (this.playing) {
        g.fillStyle = 'rgba(255,181,71,0.25)';
        g.fillRect(sx(this.progress) - 2, 40, 4, 220);
      }
    }
    this.texture.needsUpdate = true;
  }
}
