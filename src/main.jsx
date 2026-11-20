import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { useGame, useUI } from './game/store';

// Dev-only handles for testing (not included in the production build's behaviour).
if (import.meta.env.DEV) Object.assign(window, { __game: useGame, __ui: useUI });

// Canvas textures draw Hebrew signage with Heebo/Rubik, so wait (briefly) for the fonts.
const fontsReady = Promise.race([
  Promise.all([
    document.fonts.load('700 48px Rubik'),
    document.fonts.load('400 32px Heebo'),
    document.fonts.load('700 32px Heebo'),
  ]),
  new Promise((r) => setTimeout(r, 2500)),
]);

fontsReady.finally(() => {
  createRoot(document.getElementById('root')).render(<App />);
});
