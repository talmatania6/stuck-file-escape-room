import { useEffect, useState } from 'react';
import { useUI } from '../game/store';
import { sfx } from '../audio/audio';
import { IconClose } from './Icons';

/**
 * Close-up frame for a puzzle device. It slides in over the room (the room stays
 * visible around it), closes with Esc or ✕, and never hides the answer field.
 */
export function Device({ title, subtitle, tone = 'steel', wide, children, onClose }) {
  const close = useUI((s) => s.closeOverlay);
  const done = onClose || close;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && done();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done]);
  return (
    <div className="overlay device-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`device tone-${tone} ${wide ? 'wide' : ''}`}>
        <div className="device-head">
          <div>
            <strong>{title}</strong>
            {subtitle && <small>{subtitle}</small>}
          </div>
          <button type="button" className="icon-btn" onClick={done} aria-label="סגירה – חזרה לחדר">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** One-line feedback under a puzzle. kind: info | error | ok */
export function Feedback({ kind = 'info', children }) {
  return (
    <p className={`feedback ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

/**
 * Drag-and-drop matching (rooms 2 and 7). Works with a mouse (drag) and with
 * clicks/keyboard (pick an item, then pick a target). Nothing is checked until
 * the team presses the check button, and everything can be moved again.
 */
export function MatchBoard({ items, targets, solution, checkLabel = 'בדיקה', onWrong, onSolved, renderItem, renderTarget, stampOnOk }) {
  const [placed, setPlaced] = useState({}); // targetId -> itemId
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(null); // targetId -> bool
  const [msg, setMsg] = useState(null);

  const where = (itemId) => Object.keys(placed).find((t) => placed[t] === itemId);
  const place = (itemId, targetId) => {
    sfx.drop();
    setChecked(null);
    setMsg(null);
    setPlaced((cur) => {
      const next = { ...cur };
      for (const t of Object.keys(next)) if (next[t] === itemId) delete next[t];
      next[targetId] = itemId;
      return next;
    });
    setPicked(null);
  };
  const unplace = (targetId) => {
    setChecked(null);
    setPlaced((cur) => {
      const next = { ...cur };
      delete next[targetId];
      return next;
    });
  };
  const check = () => {
    if (Object.keys(placed).length < targets.length) {
      sfx.buzz();
      setMsg({ kind: 'error', text: 'עוד לא כל המקומות מלאים.' });
      return;
    }
    const res = Object.fromEntries(targets.map((t) => [t.id, solution[t.id] === placed[t.id]]));
    setChecked(res);
    if (Object.values(res).every(Boolean)) {
      if (stampOnOk) sfx.stamp();
      sfx.success();
      setMsg({ kind: 'ok', text: 'מעולה, זה עבד.' });
      onSolved?.();
    } else {
      sfx.buzz();
      const wrong = Object.values(res).filter((v) => !v).length;
      setMsg({ kind: 'error', text: `${wrong === 1 ? 'אחד המקומות' : `${wrong} מקומות`} לא נכונים. אפשר להזיז ולבדוק שוב.` });
      onWrong?.();
    }
  };
  const free = items.filter((i) => !where(i.id));

  return (
    <div className="match">
      <div className="match-tray" aria-label="פריטים לשיבוץ">
        {free.length === 0 && <p className="muted small">כל הפריטים שובצו. אפשר לגרור פריט בחזרה כדי להחליף.</p>}
        {free.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`match-item ${picked === it.id ? 'picked' : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', it.id);
              sfx.pick();
            }}
            onClick={() => {
              sfx.pick();
              setPicked(picked === it.id ? null : it.id);
            }}
            aria-pressed={picked === it.id}
          >
            {renderItem(it)}
          </button>
        ))}
      </div>
      <div className="match-targets">
        {targets.map((t) => {
          const itemId = placed[t.id];
          const item = items.find((i) => i.id === itemId);
          const state = checked ? (checked[t.id] ? 'ok' : 'bad') : '';
          return (
            <div
              key={t.id}
              className={`match-target ${state} ${picked ? 'ready' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('over');
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove('over')}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('over');
                const id = e.dataTransfer.getData('text/plain');
                if (id) place(id, t.id);
              }}
            >
              <div className="target-head">{renderTarget(t)}</div>
              {item ? (
                <button
                  type="button"
                  className="match-item placed"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                  onClick={() => unplace(t.id)}
                  title="לחיצה מחזירה את הפריט"
                >
                  {renderItem(item)}
                  {state === 'ok' && stampOnOk && <span className="stamp">אושר</span>}
                </button>
              ) : (
                <button type="button" className="drop-slot" onClick={() => picked && place(picked, t.id)} disabled={!picked}>
                  {picked ? 'לשים כאן' : 'גררו לכאן'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="device-actions">
        <button type="button" className="btn" onClick={check}>{checkLabel}</button>
        {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
      </div>
    </div>
  );
}
