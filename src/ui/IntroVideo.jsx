// Intro film shown after the team picks a name: Ping explains the mission and how to play.
// It is a pre-made video (public/intro/ping-intro-v4.mp4, subtitles burned in) with the usual
// player controls; when it ends (or is skipped) the end card starts the mission.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame, useUI } from '../game/store';
import { sfx, setMuted as setAudioMuted } from '../audio/audio';

const BASE = import.meta.env.BASE_URL;
const FILM = `${BASE}intro/ping-intro-v4.mp4`;
const POSTER = `${BASE}intro/ping-intro-v4-poster.jpg`;

export function IntroVideo() {
  const start = useGame((s) => s.startMission);
  const team = useGame((s) => s.team);
  const muted = useGame((s) => s.muted);

  const video = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blocked, setBlocked] = useState(false); // the browser refused to autoplay with sound

  // start playing; if sound autoplay is blocked, show a big play button instead
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.play().catch(() => { setPlaying(false); setBlocked(true); });
  }, []);

  useEffect(() => { if (video.current) video.current.muted = muted; }, [muted]);

  const play = () => { video.current?.play().then(() => { setPlaying(true); setBlocked(false); }).catch(() => {}); };
  const pause = () => { video.current?.pause(); setPlaying(false); };
  const toggle = () => (playing ? pause() : play());

  const finish = () => {
    video.current?.pause();
    setEnded(true);
    sfx.impact();
  };

  const go = useCallback(() => {
    video.current?.pause();
    useUI.getState().setStandpoint('center');
    start();
  }, [start]);

  const replay = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    setProgress(0);
    v.play().then(() => setPlaying(true)).catch(() => { setPlaying(false); setBlocked(true); });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !ended) finish();
      if (e.key === ' ' && !ended) { e.preventDefault(); toggle(); }
      if (e.key === 'Enter' && ended) go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`cine-intro film-intro${ended ? ' ended' : ''}`}>
      <video
        ref={video}
        className="iv-video"
        src={FILM}
        poster={POSTER}
        playsInline
        preload="auto"
        onClick={() => !ended && toggle()}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
        onEnded={finish}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {blocked && !ended && (
        <button type="button" className="iv-bigplay" onClick={play} aria-label="הפעלת הסרטון">
          <svg viewBox="0 0 24 24" width="44" height="44"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>
        </button>
      )}

      {/* end card */}
      {ended && (
        <div className="iv-end">
          <span className="iv-kicker">קבוצת {team}</span>
          <h2>הכול מוכן. נועה סומכת עליכם שתשלחו את הקובץ בזמן.</h2>
          <div className="iv-end-actions">
            <button type="button" className="btn big" onClick={go} autoFocus>יוצאים לדרך</button>
            <button type="button" className="btn ghost" onClick={replay}>לצפות שוב</button>
          </div>
        </div>
      )}

      {/* player controls */}
      {!ended && (
        <div className="iv-controls">
          <button type="button" className="iv-ctl" onClick={toggle} aria-label={playing ? 'השהיה' : 'המשך'}>
            {playing ? <svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg> : <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>}
          </button>
          <button type="button" className="iv-ctl" onClick={() => { useGame.getState().setMuted(!muted); setAudioMuted(!muted); }} aria-label={muted ? 'הפעלת סאונד' : 'השתקה'}>
            {muted ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg> : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>}
          </button>
          <button type="button" className="iv-ctl iv-skip" onClick={finish}>דלגו</button>
        </div>
      )}
      <div className="iv-progress"><span style={{ width: `${ended ? 100 : Math.min(100, progress * 100)}%` }} /></div>
    </div>
  );
}
