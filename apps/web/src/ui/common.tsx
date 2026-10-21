import { useEffect, useRef, useState } from 'react';
import { ROLE_INFO, mapSkin, type RoleId } from '@hidden-truth/shared';
import { useStore } from '../store';

export const asset = (p: string) => `/assets/${p}`;

/** Public skin of the current room's map (rooms, stations, story, art paths). */
export const useSkin = () => mapSkin(useStore((s) => s.room?.mapSlug));

/**
 * ESC closes the top-most popup only. Every open popup pushes its close handler on a stack;
 * a single window listener pops the last one (map > role card > task > guide …).
 */
const escStack: { cb: () => void }[] = [];
let escBound = false;
function onEscKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !escStack.length) return;
  const ae = document.activeElement as HTMLElement | null;
  // first ESC inside a text field just leaves the field
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.closest('.chat')) {
    ae.blur();
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  escStack[escStack.length - 1].cb();
}
export function useEscape(onEsc: (() => void) | undefined, active = true) {
  const ref = useRef(onEsc);
  ref.current = onEsc;
  useEffect(() => {
    if (!active || !ref.current) return;
    if (!escBound) {
      window.addEventListener('keydown', onEscKey, true);
      escBound = true;
    }
    const entry = { cb: () => ref.current?.() };
    escStack.push(entry);
    return () => {
      const i = escStack.indexOf(entry);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, [active, !!onEsc]);
}
/**
 * Button handlers that fire on touch-down: browsers only synthesize `click` for a lone finger, so a
 * second finger (thumb still on the joystick) would never trigger it. Mouse / keyboard keep onClick.
 */
export const tapProps = (fn: () => void) => ({
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    (e.currentTarget as HTMLElement & { tapAt?: number }).tapAt = Date.now();
    fn();
  },
  onClick: (e: React.MouseEvent<HTMLElement>) => {
    // the click that trails a touch was already handled on pointerdown
    const el = e.currentTarget as HTMLElement & { tapAt?: number };
    const at = el.tapAt ?? 0;
    el.tapAt = 0;
    if (Date.now() - at > 3000) fn();
  },
});

/** Small "Esc" hint shown next to close buttons. */
export const EscHint = () => <kbd className="esc-hint">Esc</kbd>;

/** Painted round close button (same art as the guide popup) used by every popup. */
export const CloseButton = ({ onClick, label = 'Đóng', className = '' }: { onClick: () => void; label?: string; className?: string }) => (
  <button type="button" className={`x-btn ${className}`} onClick={onClick} aria-label={label} title={label}>
    <img src={asset('maps/common/ui/guide/btn-close.webp')} alt="" draggable={false} />
  </button>
);

/** Where the package lies (px) while nobody carries it. Primitive selectors: an object selector would re-render forever. */
export function usePackageSpot() {
  const on = useStore((s) => s.room?.phase === 'explore' && (s.room.packageState === 'home' || s.room.packageState === 'dropped'));
  const x = useStore((s) => s.room?.packageX ?? 0);
  const y = useStore((s) => s.room?.packageY ?? 0);
  return on ? { x, y } : null;
}

export function useCountdown(endsAt: number) {
  const offset = useStore((s) => s.timeOffset);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - (now + offset)) / 1000));
}

export const fmt = (sec: number | null) => (sec == null ? '' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

/** Countdown text with fixed-width digit cells: the UI font has no tabular figures, so ticking numbers would jitter. */
export function Digits({ text }: { text: string | number }) {
  return (
    <span className="digits">
      {[...String(text)].map((c, i) => (/\d/.test(c) ? <i key={i}>{c}</i> : c))}
    </span>
  );
}

export function RoleBadge({ role, size = 48 }: { role: RoleId; size?: number }) {
  return <img className="role-icon" src={asset(`maps/common/ui/roles/${ROLE_INFO[role].icon}.webp`)} width={size} height={size} alt={ROLE_INFO[role].name} />;
}

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return <img src={asset(`maps/common/ui/${name}.webp`)} width={size} height={size} alt="" className="ui-icon" />;
}

export function Modal({ title, onClose, children, wide, className = '' }: { title: string; onClose?: () => void; children: React.ReactNode; wide?: boolean; className?: string }) {
  useEscape(onClose);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''} ${className}`}>
        <header>
          <h3>{title}</h3>
          {onClose && (
            <span className="modal-close-wrap">
              <EscHint />
              <CloseButton onClick={onClose} />
            </span>
          )}
        </header>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind ?? 'info'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
