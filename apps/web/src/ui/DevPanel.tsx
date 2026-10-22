import { useState } from 'react';
import { create } from 'zustand';

/** dev-only debug toggles; GameScene subscribes to these */
export const useDev = create<{ showColliders: boolean; showHitbox: boolean; set: (p: Partial<{ showColliders: boolean; showHitbox: boolean }>) => void }>((set) => ({
  showColliders: false,
  showHitbox: false,
  set: (p) => set(p),
}));

/** Floating 🛠 button + popup with debug overlays. Rendered only when import.meta.env.DEV. */
export function DevPanel() {
  const [open, setOpen] = useState(false);
  const { showColliders, showHitbox, set } = useDev();
  return (
    <div className="dev-panel">
      <button type="button" className="dev-panel-btn" title="Dev tools" onClick={() => setOpen((o) => !o)}>
        🛠
      </button>
      {open && (
        <div className="dev-panel-pop" role="dialog" aria-label="Dev tools">
          <div className="dev-panel-head">
            Dev
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <label>
            <input type="checkbox" checked={showColliders} onChange={(e) => set({ showColliders: e.target.checked })} />
            Tô viền đỏ vật cản
          </label>
          <label>
            <input type="checkbox" checked={showHitbox} onChange={(e) => set({ showHitbox: e.target.checked })} />
            Hiện hitbox người chơi
          </label>
        </div>
      )}
    </div>
  );
}
