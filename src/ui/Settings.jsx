import { useEffect } from 'react';
import { useGame, useUI } from '../game/store';
import { useSettings, usePointer, QUALITY } from '../game/settings';
import { setMuted } from '../audio/audio';
import { IconClose } from './Icons';

export const IconGear = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export function SettingsButton({ className = 'icon-btn' }) {
  const open = usePointer((s) => s.setSettingsOpen);
  return (
    <button type="button" className={className} onClick={() => open(true)} aria-label="הגדרות" title="הגדרות">
      <IconGear />
    </button>
  );
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

function Slider({ value, min, max, step, onChange, label, format = (v) => v }) {
  return (
    <div className="slider-row">
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
      <output dir="ltr">{format(value)}</output>
    </div>
  );
}

/** The settings panel – controls, view, graphics, sound and comfort. */
export function SettingsPanel() {
  const open = usePointer((s) => s.settingsOpen);
  const close = () => usePointer.getState().setSettingsOpen(false);
  const st = useSettings();
  const muted = useGame((s) => s.muted);
  const calm = useGame((s) => s.reduceMotion);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const mouse = st.controlMode === 'mouse';
  return (
    <div className="overlay device-overlay settings-overlay" role="dialog" aria-modal="true" aria-label="הגדרות" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="device tone-steel settings">
        <div className="device-head">
          <div>
            <strong>הגדרות</strong>
            <small>נשמרות בדפדפן הזה</small>
          </div>
          <button type="button" className="icon-btn" onClick={close} aria-label="סגירת ההגדרות">
            <IconClose />
          </button>
        </div>

        <section className="set-group">
          <h3>שליטה</h3>
          <div className="set-row col">
            <span className="set-label">איך מסתכלים מסביב</span>
            <Segmented
              label="מצב שליטה"
              value={st.controlMode}
              onChange={(v) => st.update({ controlMode: v })}
              options={[
                { value: 'mouse', label: 'תנועת עכבר', hint: 'כמו במשחקי FPS' },
                { value: 'drag', label: 'גרירה', hint: 'לוחצים וגוררים' },
              ]}
            />
            <p className="set-note">
              {mouse
                ? 'לוחצים על המסך כדי לנעול את העכבר למבט. מכוונים עם הנקודה שבמרכז ולוחצים כדי להפעיל חפץ. Esc משחרר את העכבר.'
                : 'לוחצים וגוררים כדי להסתובב. לוחצים על חפץ כדי להפעיל אותו.'}
            </p>
          </div>
          <div className="set-row">
            <span className="set-label">רגישות עכבר</span>
            <Slider label="רגישות עכבר" value={st.sensitivity} min={0.3} max={2.5} step={0.1} onChange={(v) => st.update({ sensitivity: v })} format={(v) => `${v.toFixed(1)}×`} />
          </div>
          <div className="set-row">
            <span className="set-label">היפוך ציר אנכי</span>
            <Toggle label="היפוך ציר אנכי" checked={st.invertY} onChange={(v) => st.update({ invertY: v })} />
          </div>
          <div className="set-row">
            <span className="set-label">מהירות הליכה</span>
            <Slider label="מהירות הליכה" value={st.walkSpeed} min={0.6} max={1.6} step={0.1} onChange={(v) => st.update({ walkSpeed: v })} format={(v) => `${v.toFixed(1)}×`} />
          </div>
          <p className="set-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> או החיצים: הליכה · <kbd>←</kbd><kbd>→</kbd>: סיבוב</p>
        </section>

        <section className="set-group">
          <h3>תצוגה</h3>
          <div className="set-row">
            <span className="set-label">שדה ראייה</span>
            <Slider label="שדה ראייה" value={st.fov} min={60} max={90} step={1} onChange={(v) => st.update({ fov: v })} format={(v) => `${v}°`} />
          </div>
          <div className="set-row col">
            <span className="set-label">איכות גרפיקה</span>
            <Segmented
              label="איכות גרפיקה"
              value={st.quality}
              onChange={(v) => st.update({ quality: v })}
              options={Object.entries(QUALITY).map(([value, q]) => ({ value, label: q.label }))}
            />
            <p className="set-note">אם המשחק איטי במחשב, כדאי לבחור ״חסכונית״: בלי זוהר ובלי חלקיקים, ברזולוציה נמוכה יותר.</p>
          </div>
        </section>

        <section className="set-group">
          <h3>סאונד ונוחות</h3>
          <div className="set-row">
            <span className="set-label">סאונד</span>
            <Toggle label="סאונד" checked={!muted} onChange={(on) => { useGame.getState().setMuted(!on); setMuted(!on); }} />
          </div>
          <div className="set-row">
            <span className="set-label">הפחתת תנועה ואנימציות</span>
            <Toggle label="הפחתת תנועה" checked={calm} onChange={(v) => useGame.getState().setReduceMotion(v)} />
          </div>
        </section>

        <div className="device-actions">
          <button type="button" className="btn" onClick={close}>סיום</button>
          <button type="button" className="btn ghost" onClick={() => st.reset()}>איפוס לברירת המחדל</button>
        </div>
      </div>
    </div>
  );
}

/** Crosshair while the mouse is locked; a gentle hint when FPS mode is on but the mouse is free. */
export function ViewHint() {
  const locked = usePointer((s) => s.locked);
  const mode = useSettings((s) => s.controlMode);
  const busy = useUI((s) => Boolean(s.overlay) || s.helpOpen || s.journalOpen || s.successOpen || s.fading);
  const settings = usePointer((s) => s.settingsOpen);
  const hovered = useUI((s) => s.hovered);
  if (mode !== 'mouse') return null;
  if (locked) return <div className={`crosshair ${hovered ? 'on' : ''}`} aria-hidden="true" />;
  if (busy || settings) return null;
  return <div className="lock-hint" role="status">לחצו על המסך כדי להסתכל עם העכבר · <kbd>Esc</kbd> משחרר</div>;
}
