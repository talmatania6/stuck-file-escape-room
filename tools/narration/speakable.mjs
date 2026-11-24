// lines.json → lines.tsv (key, voice, spoken text). Subtitles keep the original text;
// only what the voice reads gets pronunciation help.
import fs from 'node:fs';
const fix = (t) => t
  .replace(/גליץ׳|גליץ'/g, "גְּלִיץ'")
  .replace(/פינג/g, 'פִּינְג')
  .replace(/LAYER 0(\d)/g, 'שכבה $1')
  .replace(/\s*[–·]\s*/g, ', ')
  .replace(/\t|\n/g, ' ');
const lines = JSON.parse(fs.readFileSync('tools/narration/lines.json', 'utf8'));
fs.writeFileSync('tools/narration/lines.tsv', lines.map((l) => [l.key, l.who === 'glitch' ? 'he-IL-AvriNeural' : 'he-IL-HilaNeural', fix(l.text)].join('\t')).join('\n') + '\n', 'utf8');
console.log('ok', lines.length);
