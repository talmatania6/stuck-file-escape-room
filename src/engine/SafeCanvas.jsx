// A <Canvas> that can't leave the player staring at a black screen.
//
// Two things used to blank the game:
//  1. A runtime error inside a 3D scene – with no error boundary React unmounted the
//     whole app, leaving only the black page background.
//  2. A lost WebGL context (GPU overloaded / driver reset / too many contexts) – the
//     canvas stays black forever and nothing recovers it.
// SafeCanvas catches both: it logs what happened, rebuilds the scene on a fresh WebGL
// context (game progress lives in the store, so nothing is lost), steps graphics
// quality down after a context loss, and – if the scene keeps failing – shows a
// clear message with a way out instead of a silent black screen.
import { Component, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { logError, logInfo, logWarn } from '../game/log';
import { useSettings, stepDownQuality } from '../game/settings';
import { useGame, useUI } from '../game/store';

class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    logError(`scene "${this.props.label}" crashed`, error);
    if (info?.componentStack) console.error(info.componentStack);
    this.props.onError?.(error);
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

/**
 * Watches the frame rate for a few seconds after a scene starts. If this computer is
 * struggling, it steps the graphics level down once (high → medium → low) so the game
 * runs smoothly, and tells the player. Only when "automatic quality" is on.
 */
function AutoQuality() {
  const s = useRef({ t: 0, frames: 0, done: false });
  useFrame((_, dt) => {
    const st = s.current;
    if (st.done || !useSettings.getState().autoQuality) return;
    if (document.hidden) return;
    st.t += dt;
    if (st.t < 2.5) return; // let loading hitches settle
    st.frames += 1;
    if (st.t >= 7.5) {
      st.done = true;
      const fps = st.frames / (st.t - 2.5);
      const q = useSettings.getState().quality;
      if ((q === 'high' && fps < 40) || (q === 'medium' && fps < 28)) {
        stepDownQuality();
        logInfo('auto quality', `${Math.round(fps)} fps on "${q}" → "${useSettings.getState().quality}"`);
        useUI.getState().toast('הגרפיקה הותאמה למחשב הזה כדי שהמשחק ירוץ חלק. אפשר לשנות בהגדרות.');
      }
    }
  });
  return null;
}

export function SafeCanvas({ label = 'scene', children, onCreated, ...props }) {
  const [gen, setGen] = useState(0);
  const [status, setStatus] = useState('ok'); // ok | recovering | failed
  const failures = useRef([]);
  const cleanup = useRef(null);

  useEffect(() => () => cleanup.current?.(), []);

  const recover = (reason) => {
    const now = Date.now();
    failures.current = failures.current.filter((t) => now - t < 30000);
    failures.current.push(now);
    if (failures.current.length > 3) {
      logError(`scene "${label}"`, `giving up after repeated failures (${reason})`);
      setStatus('failed');
      return;
    }
    setStatus('recovering');
    setTimeout(() => {
      setGen((g) => g + 1);
      setStatus('ok');
    }, 450);
  };

  const handleCreated = (state) => {
    const el = state.gl.domElement;
    cleanup.current?.();
    const onLost = (e) => {
      e.preventDefault();
      logWarn(`scene "${label}"`, 'WebGL context lost – rebuilding the scene');
      stepDownQuality();
      recover('context lost');
    };
    el.addEventListener('webglcontextlost', onLost);
    cleanup.current = () => el.removeEventListener('webglcontextlost', onLost);
    logInfo(`scene "${label}"`, `ready (WebGL ${state.gl.capabilities.isWebGL2 ? 2 : 1})`);
    onCreated?.(state);
  };

  return (
    <>
      {status !== 'failed' && (
        <SceneBoundary key={`b${gen}`} label={label} onError={() => recover('error')}>
          {status === 'ok' && (
            <Canvas key={gen} {...props} onCreated={handleCreated}>
              {children}
              <AutoQuality />
            </Canvas>
          )}
        </SceneBoundary>
      )}
      {status === 'recovering' && (
        <div className="scene-status" role="status">
          <span className="spinner" aria-hidden="true" /> טוענים מחדש את התצוגה…
        </div>
      )}
      {status === 'failed' && (
        <div className="scene-failed" role="alert">
          <h2>התצוגה התקשתה להיטען</h2>
          <p>ההתקדמות שלכם שמורה. אפשר לנסות שוב, או לחזור לאולם ולהמשיך משם.</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => { failures.current = []; setStatus('ok'); setGen((g) => g + 1); }}>לנסות שוב</button>
            {useGame.getState().startedAt && (
              <button type="button" className="btn ghost" onClick={() => useGame.getState().backToHub()}>חזרה לאולם</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Top-level safety net for the HTML interface (anything outside a canvas). */
export class AppBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    logError('interface crashed', error);
    if (info?.componentStack) console.error(info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="scene-failed app" role="alert">
        <h2>משהו השתבש</h2>
        <p>ההתקדמות שלכם שמורה בדפדפן. טעינה מחדש תחזיר אתכם למסך הפתיחה, ומשם אפשר להמשיך.</p>
        <div className="row">
          <button type="button" className="btn" onClick={() => window.location.reload()}>טעינה מחדש</button>
        </div>
      </div>
    );
  }
}
