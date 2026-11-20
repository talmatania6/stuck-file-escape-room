// Room 1 – the physical layer. Texts live in src/game/rooms.js.

/** The activation code the signal generator transmits. short = 0, long = 1. */
export const CODE = '10110010';

export const STANDPOINTS = {
  center: { label: 'מרכז החדר', pos: [0, 1.65, 1.2], look: [0, 1.4, -4.5] },
  cabinet: { label: 'לוח החשמל', pos: [-1.5, 1.6, -2.5], look: [-1.5, 1.25, -4.5] },
  bench: { label: 'שולחן העבודה', pos: [-2.85, 1.48, 0.3], look: [-4.5, 1.08, 0.3] },
  locker: { label: 'ארונית הצוות', pos: [2, 1.6, 2.35], look: [2, 1.15, 4.5] },
  door: { label: 'הדלת ולוח הקוד', pos: [1.85, 1.62, -0.85], look: [4.5, 1.62, -0.85] },
};
