import { useEffect, useState } from 'react';
import { ROLE_INFO, type RoleId } from '@hidden-truth/shared';
import { useStore } from '../store';

export const asset = (p: string) => `/assets/${p}`;

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

export function RoleBadge({ role, size = 48 }: { role: RoleId; size?: number }) {
  return <img className="role-icon" src={asset(`common/ui/roles/${ROLE_INFO[role].icon}.webp`)} width={size} height={size} alt={ROLE_INFO[role].name} />;
}

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return <img src={asset(`common/ui/${name}.webp`)} width={size} height={size} alt="" className="ui-icon" />;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose?: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <header>
          <h3>{title}</h3>
          {onClose && (
            <button className="close" onClick={onClose} aria-label="Đóng">
              ×
            </button>
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
