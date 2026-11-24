// Collects every line Ping (and Glitch) can say in speech bubbles + the "what we learned" texts.
// Output: tools/narration/lines.json  [{ key, who, text }]
import fs from 'node:fs';
import path from 'node:path';
import { voiceKey } from '../../src/audio/voiceKey.js';
import { ROOMS, HUB_TEXT, GLITCH_NO_MORE } from '../../src/game/rooms.js';

const out = new Map();
const add = (who, text) => { if (typeof text === 'string' && text.trim()) out.set(voiceKey(text), { key: voiceKey(text), who, text: text.trim() }); };

HUB_TEXT.intro.forEach((t) => add('companion', t));
HUB_TEXT.allDone.forEach((t) => add('companion', t));
add('companion', HUB_TEXT.done);
for (let n = 1; n <= 7; n++) add('companion', HUB_TEXT.locked(n));
for (let k = 0; k <= 7; k++) add('companion', HUB_TEXT.core(k));
for (const r of ROOMS) if (r.n >= 2 && r.n <= 7) add('companion', HUB_TEXT.unlocked(r.n, r.en));
add('glitch', GLITCH_NO_MORE);
for (const r of ROOMS) {
  (r.enter || []).forEach((t) => add('companion', t));
  for (const [k, v] of Object.entries(r.lines || {})) add(k === 'glitch' ? 'glitch' : 'companion', v);
  add('companion', r.learn);
}
// literal lines spoken from the code: say('companion' | 'glitch', '...')
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk('src').filter((f) => /\.(jsx?|mjs)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/say\(\s*'(companion|glitch)'\s*,\s*'([^']*)'/g)) add(m[1], m[2]);
  for (const m of src.matchAll(/say\(\s*'(companion|glitch)'\s*,\s*"([^"]*)"/g)) add(m[1], m[2]);
}
const list = [...out.values()];
fs.writeFileSync('tools/narration/lines.json', JSON.stringify(list, null, 1), 'utf8');
console.log(`${list.length} lines (${list.filter((l) => l.who === 'glitch').length} Glitch), ${list.reduce((a, l) => a + l.text.length, 0)} chars`);
