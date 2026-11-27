import { ROOMS } from './rooms';

/**
 * Lines where Ping tells the team what to do next (or how to solve it).
 * They are not said automatically any more: they wait in the "רמז" panel,
 * so a team that wants to work it out alone can. Listed by key, not by text,
 * so the wording in rooms.js can change freely.
 *
 *   enter: indexes into room.enter
 *   lines: keys of room.lines
 *   retry: keys that answer a wrong try – the bubble still says "not yet",
 *          just without the solution path in it
 */
export const DIRECTIVE = {
  1: { enter: [1], lines: ['firstPlay', 'cabinet', 'ready', 'wrong', 'locked'], retry: ['wrong', 'locked'] },
  2: { enter: [1], lines: ['allFound', 'wrong', 'missing'], retry: ['wrong', 'missing'] },
  3: { enter: [1], lines: [], retry: [] },
  4: { enter: [1], lines: [], retry: [] },
  5: { enter: [1], lines: ['wrong'], retry: ['wrong'] },
  6: { enter: [1], lines: ['noKey', 'wrong'], retry: ['noKey', 'wrong'] },
  7: { enter: [1], lines: ['wrong'], retry: ['wrong'] },
  8: { enter: [], lines: ['wrong'], retry: ['wrong'] },
};

/** What the bubble says instead of a directive answer to a wrong try. */
export const RETRY_LINE = 'לא בדיוק. נסו שוב.';

const cache = new Map();
/** For room n: Map(text → { retry }) of its directive lines (built from the current texts). */
export function directiveTexts(n) {
  if (cache.has(n)) return cache.get(n);
  const room = ROOMS.find((r) => r.n === n);
  const d = DIRECTIVE[n];
  const m = new Map();
  if (room && d) {
    d.enter.forEach((i) => room.enter?.[i] && m.set(room.enter[i].trim(), { retry: false }));
    d.lines.forEach((k) => room.lines?.[k] && m.set(room.lines[k].trim(), { retry: d.retry.includes(k) }));
  }
  cache.set(n, m);
  return m;
}
