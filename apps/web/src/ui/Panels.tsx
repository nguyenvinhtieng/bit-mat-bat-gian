import { useEffect, useRef, useState } from 'react';
import { GAME, HUE_PRELUDE, ROLE_INFO } from '@hidden-truth/shared';
import { useStore } from '../store';
import { RoleBadge, useEscape } from './common';

const FLY_MS = 850; // role reveal shrinking into the HUD role card
const PRELUDE_MS = 3400; // dark "night falls" lines before the role, so players settle in first
// role reveal is held until the server starts the night (canh một) — the story lives in the Guide
const ROLE_MS = GAME.introSec * 1000 - PRELUDE_MS - FLY_MS;

/** Opening: night-falls prelude -> role reveal, then it shrinks into the HUD role card and the night (canh một) begins. */
export function IntroModal() {
  const open = useStore((s) => s.introOpen);
  const me = useStore((s) => s.me);
  const quick = useStore((s) => s.introQuick);
  const set = useStore((s) => s.set);
  const [stage, setStage] = useState<'prelude' | 'role' | 'game'>('prelude');
  const [leaving, setLeaving] = useState(false);
  const [flying, setFlying] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setStage(quick ? 'role' : 'prelude');
      setLeaving(false);
      setFlying(false);
    }
  }, [open]);

  // the opening is not skippable so all players enter at the same moment the night starts
  useEffect(() => {
    if (!open || quick || stage === 'game') return;
    const t = setTimeout(() => setStage(stage === 'prelude' ? 'role' : 'game'), stage === 'prelude' ? PRELUDE_MS : ROLE_MS);
    return () => clearTimeout(t);
  }, [open, quick, stage]);
  useEffect(() => {
    if (stage === 'game') close();
  }, [stage]);

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    // shrink the role reveal into the HUD role card so players learn where to re-open it
    const role = roleRef.current;
    const card = document.querySelector<HTMLElement>('.role-card');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (role && card && !calm) {
      setFlying(true);
      const from = role.getBoundingClientRect();
      const to = card.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const s = Math.max(0.05, Math.min(to.width / from.width, to.height / from.height));
      const fly = role.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.9, offset: 0.85 },
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0 },
        ],
        { duration: FLY_MS, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards' },
      );
      fly.onfinish = () => {
        set({ introOpen: false });
        card.classList.remove('arrive');
        void card.offsetWidth; // restart the pulse if it is already applied
        card.classList.add('arrive');
        setTimeout(() => card.classList.remove('arrive'), 1600);
      };
      return;
    }
    setTimeout(() => set({ introOpen: false }), 600);
  };
  // only the quick re-open (from the HUD role card) can be dismissed by the player
  useEscape(close, open && quick && !!me);

  useEffect(() => {
    if (!open || !quick) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (!open || !me) return null;
  const info = ROLE_INFO[me.role];
  const killer = me.faction === 'killer';

  return (
    <div className={`opening ${leaving ? 'leaving' : ''} ${flying ? 'to-card' : ''} ${quick ? 'quick' : ''}`} onClick={quick ? close : undefined}>
      {stage === 'prelude' && (
        <div className="opening-prelude" key="prelude" style={{ animationDelay: `${PRELUDE_MS - 600}ms` }}>
          {HUE_PRELUDE.map((l, i) => (
            <p key={i} style={{ animationDelay: `${0.4 + i * 1}s` }}>
              {l}
            </p>
          ))}
        </div>
      )}
      {stage === 'role' && (
        <div className={`opening-role ${me.faction}`} key="role" ref={roleRef}>
          <span className="opening-eyebrow">Vai trò của bạn</span>
          <div className="opening-badge">
            <RoleBadge role={me.role} size={140} />
          </div>
          <span className="faction">{killer ? 'Phe Âm Binh' : 'Phe Người Dân'}</span>
          <h2>{info.name}</h2>
          <p className="opening-desc">{info.desc}</p>
          {killer && me.mates && me.mates.length > 0 && (
            <p className="opening-mates">
              <b>Đồng bọn:</b> {me.mates.join(', ')}
            </p>
          )}
          <p className="objective">
            <b>Mục tiêu:</b> {me.objective}
          </p>
          <p className="opening-tip">
            {killer ? (
              <>Lại gần mục tiêu và bấm <kbd>K</kbd>. Nhiệm vụ của bạn chỉ là giả.</>
            ) : (
              <>Làm nhiệm vụ ở các vòng sáng vàng. Thấy thi thể thì bấm <kbd>R</kbd>.</>
            )}
          </p>
          {quick && (
            <button
              className="btn primary big"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
            >
              Đóng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
