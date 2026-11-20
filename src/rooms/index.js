import * as room1 from './room1';
import * as room2 from './room2/index.jsx';
import * as room3 from './room3/index.jsx';
import * as room4 from './room4/index.jsx';
import * as room5 from './room5/index.jsx';
import * as room6 from './room6/index.jsx';
import * as room7 from './room7/index.jsx';
import * as room8 from './room8/index.jsx';

/** Every room module exports { Scene, Overlays, standpoints }. Room 8 is the "layer 8" control room. */
export const ROOM_MODULES = { 1: room1, 2: room2, 3: room3, 4: room4, 5: room5, 6: room6, 7: room7, 8: room8 };
