// Room module contract – every room exports { Scene, Overlays, standpoints }.
export { Room1Scene as Scene } from './Room1Scene.jsx';
export { Room1Overlays as Overlays } from './Room1Overlays.jsx';
export { STANDPOINTS as standpoints } from './data.js';

/** Room 1 is 9 x 9 m – a little more room to walk around. */
export const bounds = { half: 3.9 };
