import { useEffect, useState } from 'react';
import { useUI } from '../game/store';

/** A short, quiet notice at the top of the screen (auto-hides). */
export function Toast() {
  const msg = useUI((s) => s.toastMsg);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!msg) return;
    setShown(msg);
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [msg]);
  if (!shown) return null;
  return (
    <div className="toast" role="status" key={shown.key} onClick={() => setShown(null)}>
      {shown.text}
    </div>
  );
}
