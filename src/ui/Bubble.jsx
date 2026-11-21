import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGame, useUI } from '../game/store';
import { COMPANION_NAME } from '../game/rooms';
import { companionPortrait } from '../companion/companionSheet';
import { companionAnchor } from '../companion/Companion';
import { IconChevron, IconClose } from './Icons';

const NAMES = { companion: COMPANION_NAME, glitch: 'גליץ׳' };
const readTime = (text) => Math.max(3800, text.length * 62);

/**
 * Speech bubbles. While the companion is on screen the bubble sits next to her
 * head, with a tail pointing at her, so it reads as her speaking. Lines advance
 * on their own (a "next" button skips ahead); after the last one the bubble
 * shrinks to a small "hear again" button. When a puzzle is open it docks at the top.
 */
export function Bubble() {
  const bubble = useUI((s) => s.bubble);
  const collapsed = useUI((s) => s.bubbleCollapsed);
  const next = useUI((s) => s.nextLine);
  const collapse = useUI((s) => s.collapseBubble);
  const replay = useUI((s) => s.replayBubble);
  const calm = useGame((s) => s.reduceMotion);
  const docked = useUI((s) => Boolean(s.overlay));
  const spotlight = useUI((s) => s.spotlight);
  const [face, setFace] = useState(null);
  const el = useRef();
  const [side, setSide] = useState('free'); // 'left' | 'right' | 'free'

  useEffect(() => {
    companionPortrait().then(setFace);
  }, []);

  // auto-advance: nobody has to click through a speech
  useEffect(() => {
    if (!bubble || collapsed || spotlight) return; // paused while the tour is pointing at something
    const line = bubble.lines[bubble.i];
    const last = bubble.i === bubble.lines.length - 1;
    const t = setTimeout(last ? collapse : next, last ? readTime(line.text) + 3500 : readTime(line.text));
    return () => clearTimeout(t);
  }, [bubble, collapsed, collapse, next, spotlight]);

  // follow the companion on screen
  useLayoutEffect(() => {
    if (!bubble || collapsed || docked) return;
    let raf;
    const place = () => {
      const node = el.current;
      if (node) {
        const a = companionAnchor;
        const w = node.offsetWidth, h = node.offsetHeight;
        const vw = window.innerWidth, vh = window.innerHeight;
        const usable = a.visible && a.x > 40 && a.x < vw - 40 && a.y > 60 && a.y < vh - 40;
        if (usable) {
          const right = a.x < vw / 2; // bubble on the side with more room
          let x = right ? a.x + 34 : a.x - 34 - w;
          x = Math.max(12, Math.min(vw - w - 12, x));
          let y = a.y - 28;
          y = Math.max(86, Math.min(vh - h - 16, y));
          node.style.left = `${x}px`;
          node.style.top = `${y}px`;
          node.style.transform = 'none';
          const s = right ? 'right' : 'left';
          if (node.dataset.side !== s) { node.dataset.side = s; setSide(s); }
        } else {
          node.style.left = '50%';
          node.style.top = `${vh - h - 20}px`;
          node.style.transform = 'translateX(-50%)';
          if (node.dataset.side !== 'free') { node.dataset.side = 'free'; setSide('free'); }
        }
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [bubble, collapsed, docked]);

  if (!bubble || spotlight) return null;
  const line = bubble.lines[bubble.i];
  const more = bubble.i < bubble.lines.length - 1;
  const glitch = line.who === 'glitch';

  if (collapsed) {
    if (docked) return null;
    return (
      <button type="button" className="bubble-mini" onClick={replay} aria-label={`לשמוע שוב את ${COMPANION_NAME}`}>
        {face ? <img src={face} alt="" /> : <span className="face-fallback" />}
        <span>{COMPANION_NAME} · לשמוע שוב</span>
      </button>
    );
  }
  return (
    <div
      ref={el}
      className={`bubble ${glitch ? 'glitch' : ''} ${calm ? 'calm' : ''} ${docked ? 'docked' : `anchored side-${side}`}`}
      key={`${bubble.key}-${bubble.i}`}
      role="status"
      aria-live="polite"
    >
      {(docked || side === 'free' || glitch) && (
        <div className="bubble-face">
          {glitch ? <span className="glitch-face" aria-hidden="true">{'>_<'}</span> : face ? <img src={face} alt="" /> : <span className="face-fallback" />}
        </div>
      )}
      <div className="bubble-body">
        <b>{NAMES[line.who] || COMPANION_NAME}</b>
        <p key={`${bubble.key}-${bubble.i}`} className={calm ? '' : 'words'}>
          {calm
            ? line.text
            : line.text.split(' ').map((w, i) => (
                <span key={i} style={{ animationDelay: `${Math.min(i * 38, 1400)}ms` }}>
                  {w}{' '}
                </span>
              ))}
        </p>
        {more && (
          <div className="bubble-progress" aria-hidden="true">
            <span style={{ animationDuration: `${readTime(line.text)}ms` }} />
          </div>
        )}
      </div>
      <div className="bubble-actions">
        {more ? (
          <button type="button" className="bubble-next" onClick={next} aria-label="למשפט הבא">
            <IconChevron />
          </button>
        ) : (
          <button type="button" className="icon-btn small" onClick={collapse} aria-label="לסגור את הבועה">
            <IconClose />
          </button>
        )}
      </div>
    </div>
  );
}
