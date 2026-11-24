import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const GAME_MS = 30 * 60 * 1000;
export const HINT_PENALTY_MS = 2 * 60 * 1000;
export const WRONG_ROUTE_PENALTY_MS = 60 * 1000;
export const TWIST_ROOM = 8;

const fresh = {
  screen: 'start', // start | onboarding | hub | room | victory
  team: '',
  startedAt: null, // the clock starts only when the team presses "יוצאים לדרך"
  finishedAt: null,
  penaltyMs: 0,
  hintsUsed: 0,
  hintTier: {}, // room -> paid hints revealed
  currentRoom: null,
  solved: [], // 1..7, and 8 = the twist
  journal: [], // ids of clues the team has found
  roomState: {}, // small per-room flags worth keeping across reloads
  practice: false, // after the 30 minutes ran out
  hubEvent: null, // { type: 'intro' } | { type: 'solved', n }
  celebrated: [], // rooms whose "return to hub" celebration already played
  tourDone: false, // first-visit tour of the screen (room 1)
  journalTipDone: false, // the "your clues are saved here" pointer
  adminFree: false, // admin: every door open
  tutorialDone: false,
};

/** Game progress – saved in localStorage so a page refresh doesn't lose anything. */
export const useGame = create(
  persist(
    (set, get) => ({
      ...fresh,
      muted: false,
      reduceMotion: false,
      begin(team) {
        set({ ...fresh, team: team.trim() || 'קבוצה בלי שם', screen: 'onboarding' });
      },
      startMission() {
        set({ startedAt: Date.now(), screen: 'hub', hubEvent: { type: 'intro' } });
      },
      newGame() {
        set({ ...fresh });
      },
      setScreen(screen) {
        set({ screen });
      },
      enterRoom(n) {
        set({ currentRoom: n, screen: 'room' });
      },
      backToHub() {
        set({ screen: 'hub', hubEvent: null });
      },
      solveRoom(n) {
        const s = get();
        if (s.solved.includes(n)) return;
        set({ solved: [...s.solved, n], ...(n === TWIST_ROOM ? { finishedAt: Date.now() } : {}) });
      },
      completeRoom(n) {
        const s = get();
        if (n === TWIST_ROOM) return set({ screen: 'victory' });
        if (s.celebrated.includes(n)) return set({ screen: 'hub', hubEvent: null });
        set({ screen: 'hub', hubEvent: { type: 'solved', n }, celebrated: [...s.celebrated, n] });
      },
      consumeHubEvent() {
        set({ hubEvent: null });
      },
      addJournal(id) {
        const { journal } = get();
        if (!journal.includes(id)) set({ journal: [...journal, id] });
      },
      setRoomFlag(room, key, value = true) {
        set((s) => ({ roomState: { ...s.roomState, [room]: { ...(s.roomState[room] || {}), [key]: value } } }));
      },
      penalize(ms) {
        set((s) => ({ penaltyMs: s.practice ? s.penaltyMs : s.penaltyMs + ms }));
      },
      buyHint(room) {
        set((s) => ({
          hintsUsed: s.hintsUsed + 1,
          penaltyMs: s.practice ? s.penaltyMs : s.penaltyMs + HINT_PENALTY_MS,
          hintTier: { ...s.hintTier, [room]: (s.hintTier[room] || 0) + 1 },
        }));
      },
      enterPractice() {
        set({ practice: true });
      },
      finishTutorial() {
        set({ tutorialDone: true });
      },
      finishTour() {
        set({ tourDone: true });
      },
      finishJournalTip() {
        set({ journalTipDone: true });
      },
      /* ---- admin tools ---- */
      adminEnsureStarted() {
        const s = get();
        if (!s.startedAt) set({ team: s.team || 'מנהל', startedAt: Date.now(), practice: true, tutorialDone: true, tourDone: true, journalTipDone: true });
      },
      adminGo(screen, room) {
        const s = get();
        if (screen !== 'start' && screen !== 'onboarding') s.adminEnsureStarted();
        if (screen === 'victory' && !get().finishedAt) set({ finishedAt: Date.now(), solved: [1, 2, 3, 4, 5, 6, 7, 8] });
        set({ screen, ...(room ? { currentRoom: room } : {}), hubEvent: null });
      },
      adminSetSolved(n, on) {
        const s = get();
        set({
          solved: on ? [...new Set([...s.solved, n])] : s.solved.filter((k) => k !== n),
          celebrated: on ? [...new Set([...s.celebrated, n])] : s.celebrated.filter((k) => k !== n),
        });
      },
      adminSetFree(adminFree) {
        set({ adminFree });
      },
      adminTimer(off) {
        set({ practice: off });
      },
      adminResetClock() {
        set({ startedAt: Date.now(), penaltyMs: 0, practice: false, finishedAt: null });
      },
      setMuted(muted) {
        set({ muted });
      },
      setReduceMotion(reduceMotion) {
        set({ reduceMotion });
      },
    }),
    { name: 'stuck-file-v2' },
  ),
);

export const roomFlag = (s, room, key) => Boolean(s.roomState[room]?.[key]);

/** Leave a room with a short fade: solved rooms celebrate in the hub, others just return. */
export function leaveRoom(n) {
  const ui = useUI.getState();
  ui.setFading(true);
  ui.setSuccessOpen(false);
  setTimeout(() => {
    const g = useGame.getState();
    if (g.solved.includes(n)) g.completeRoom(n);
    else g.backToHub();
    useUI.getState().setFading(false);
  }, 650);
}

/**
 * Restart the whole game: progress, room states, journal, hints, timer and every bit of
 * on-screen state go back to how they were before the first click, and the team lands
 * on the opening screen. (Settings like sound/graphics and the local leaderboard stay.)
 */
export function resetGame() {
  try { document.exitPointerLock?.(); } catch { /* not locked */ }
  useUI.setState({
    hovered: null, standpoint: 'center', lookTarget: null, overlay: null, helpOpen: false, journalOpen: false,
    journalPing: 0, successOpen: false, fading: false, tutorialStep: 0, bubble: null, bubbleCollapsed: false,
    lastLines: null, hintOpen: false, resetOpen: false, spotlight: false,
  });
  useGame.getState().newGame();
}

/** Record a found clue in the journal and point the team at it. */
export function findClue(id, line) {
  const g = useGame.getState();
  const isNew = !g.journal.includes(id);
  g.addJournal(id);
  if (isNew) {
    useUI.getState().pingJournal();
    if (line) useUI.getState().say('companion', line);
  }
  return isNew;
}

/** Milliseconds left on the 20-minute clock. Never negative; frozen once the game is won. */
export function remainingMs(s, now = Date.now()) {
  if (!s.startedAt) return GAME_MS;
  const end = s.finishedAt || now;
  return Math.max(0, GAME_MS - (end - s.startedAt) - s.penaltyMs);
}

export function elapsedMs(s, now = Date.now()) {
  if (!s.startedAt) return 0;
  return (s.finishedAt || now) - s.startedAt + s.penaltyMs;
}

export function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Transient UI state (not saved). */
export const useUI = create((set, get) => ({
  hovered: null,
  setHovered: (hovered) => set({ hovered }),
  standpoint: 'center',
  setStandpoint: (standpoint) => set({ standpoint }),
  lookTarget: null, // { p: [x,y,z], key }
  lookAt: (p) => set({ lookTarget: { p, key: Date.now() } }),
  overlay: null,
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  journalOpen: false,
  setJournalOpen: (journalOpen) => set({ journalOpen }),
  journalPing: 0,
  pingJournal: () => set({ journalPing: Date.now() }),
  successOpen: false,
  setSuccessOpen: (successOpen) => set({ successOpen }),
  fading: false,
  setFading: (fading) => set({ fading }),
  tutorialStep: 0, // room-1 coach marks: 0 drag, 1 click, 2 done
  setTutorialStep: (tutorialStep) => set({ tutorialStep }),
  hintOpen: false,
  setHintOpen: (hintOpen) => set({ hintOpen }),
  resetOpen: false,
  setResetOpen: (resetOpen) => set({ resetOpen }),
  toastMsg: null,
  toast: (text) => set({ toastMsg: { text, key: Date.now() } }),
  adminOpen: false,
  setAdminOpen: (adminOpen) => set({ adminOpen }),

  /* Speech bubbles: a short queue of lines, advanced by the player. */
  bubble: null, // { lines: [{ who, text }], i, key }
  bubbleCollapsed: false,
  lastLines: null,
  speak(lines, { replace = true } = {}) {
    const list = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? { who: 'companion', text: l } : l));
    const cur = get().bubble;
    if (!replace && cur) {
      set({ bubble: { ...cur, lines: [...cur.lines, ...list] }, bubbleCollapsed: false, lastLines: [...cur.lines, ...list] });
      return;
    }
    set({ bubble: { lines: list, i: 0, key: Date.now() }, bubbleCollapsed: false, lastLines: list });
  },
  say(who, text) {
    get().speak([{ who, text }]);
  },
  nextLine() {
    const b = get().bubble;
    if (!b) return;
    if (b.i < b.lines.length - 1) set({ bubble: { ...b, i: b.i + 1 } });
    else set({ bubbleCollapsed: true });
  },
  collapseBubble: () => set({ bubbleCollapsed: true }),
  replayBubble() {
    const lines = get().lastLines;
    if (lines) set({ bubble: { lines, i: 0, key: Date.now() }, bubbleCollapsed: false });
  },
}));
