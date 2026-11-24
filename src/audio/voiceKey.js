/** Stable file name for a narrated line: FNV-1a hash of the text (so text edits get new recordings). */
export function voiceKey(text) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
