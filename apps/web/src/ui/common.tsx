import { useEffect, useState } from 'react';
import { ROLE_INFO, type Clue, type RoleId } from '@hidden-truth/shared';
import { useStore } from '../store';

export const asset = (p: string) => `/assets/${p}`;
export const clueArt = (key?: string) => (key ? asset(`maps/co-do-hue/clues/${key}.webp`) : asset('maps/co-do-hue/clues/hue-clue-paper.webp'));

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
  return <img className="role-icon" src={asset(`common/ui/roles/${role}.webp`)} width={size} height={size} alt={ROLE_INFO[role].name} />;
}

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return <img src={asset(`common/ui/${name}.webp`)} width={size} height={size} alt="" className="ui-icon" />;
}

export function ClueCard({ clue, by, actions }: { clue: Clue; by?: string; actions?: React.ReactNode }) {
  return (
    <article className="clue-card">
      <div className="clue-art" style={{ backgroundImage: `url(${clueArt(clue.art)})` }} />
      <div className="clue-body">
        <h4>{clue.title}</h4>
        <div className="clue-source">
          {clue.source}
          {by ? ` · chia sẻ bởi ${by}` : ''}
        </div>
        <p className="clue-text">{clue.body}</p>
        {clue.diff?.map((d, i) => (
          <div className="diff" key={i}>
            <div className="diff-lang">{d.lang}</div>
            <div className="diff-before">
              <span>v2 (đã duyệt)</span>
              {d.before}
            </div>
            <div className="diff-after">
              <span>Bản in</span>
              {d.after}
            </div>
          </div>
        ))}
        {clue.trace && <p className="clue-trace">🔍 {clue.trace}</p>}
        {actions && <div className="clue-actions">{actions}</div>}
      </div>
    </article>
  );
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
