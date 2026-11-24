// Central error log. Every problem is printed with a clear prefix and kept in memory,
// so a teacher (or a developer) can open the console and read `window.__stuckFileLog`.
const MAX = 40;
const entries = [];

export function logEvent(level, where, detail) {
  const entry = { time: new Date().toISOString(), level, where, detail: detail instanceof Error ? `${detail.name}: ${detail.message}` : String(detail ?? '') };
  entries.push(entry);
  if (entries.length > MAX) entries.shift();
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(`[הקובץ התקוע] ${where}:`, detail);
  return entry;
}

export const logError = (where, err) => logEvent('error', where, err);
export const logWarn = (where, msg) => logEvent('warn', where, msg);
export const logInfo = (where, msg) => logEvent('info', where, msg);

/** Catch anything that slips past React (async callbacks, failed promises). */
export function installGlobalErrorLogging() {
  if (typeof window === 'undefined' || window.__stuckFileLog) return;
  window.__stuckFileLog = entries;
  window.addEventListener('error', (e) => logError('window.error', e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason));
}
