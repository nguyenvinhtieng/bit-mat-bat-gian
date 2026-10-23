import { useEffect, useRef, useState } from 'react';
import { mapSkin } from '@hidden-truth/shared';
import { KILLER_NAME_COLOR, useStore } from '../store';
import { RoleBadge, useEscape } from './common';
import { isTouchDevice } from './Joystick';
import { sfx } from './minigames/common/kit';

const FLY_MS = 850; // role reveal shrinking into the HUD role card
// dark "night falls" lines before the role: one line every LINE_GAP_S, held HOLD_MS after the last one finishes
const LINE_START_S = 0.5;
const LINE_GAP_S = 1.4;
const LINE_IN_MS = 1100; // matches .opening-prelude p lineIn
const HOLD_MS = 1000;
const FADE_MS = 600; // matches preludeOut
const preludeMs = (lines: number) => (LINE_START_S + (lines - 1) * LINE_GAP_S) * 1000 + LINE_IN_MS + HOLD_MS + FADE_MS;
const ROLE_TAP_MS = 1800; // ignore taps until the role reveal has settled, so a stray tap does not skip it

/** Opening: night-falls prelude -> role reveal (held until the player taps), then it shrinks into the HUD role card. */
export function IntroModal() {
  const open = useStore((s) => s.introOpen);
  const me = useStore((s) => s.me);
  const quick = useStore((s) => s.introQuick);
  const set = useStore((s) => s.set);
  const [stage, setStage] = useState<'prelude' | 'role' | 'game'>('prelude');
  const [leaving, setLeaving] = useState(false);
  const [flying, setFlying] = useState(false);
  const [tappable, setTappable] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const prelude = mapSkin(useStore.getState().room?.mapSlug).story.prelude;
  const PRELUDE_MS = preludeMs(prelude.length);

  useEffect(() => {
    if (open) {
      setStage(quick ? 'role' : 'prelude');
      setLeaving(false);
      setFlying(false);
      setTappable(quick);
    }
  }, [open]);

  // the prelude is not skippable; the role then stays up until the player taps
  useEffect(() => {
    if (!open || quick || stage !== 'prelude') return;
    const t = setTimeout(() => {
      setStage('role');
      const faction = useStore.getState().me?.faction;
      if (faction) sfx.role(faction);
    }, PRELUDE_MS);
    return () => clearTimeout(t);
  }, [open, quick, stage]);
  useEffect(() => {
    if (!open || quick || stage !== 'role') return;
    const t = setTimeout(() => setTappable(true), ROLE_TAP_MS);
    return () => clearTimeout(t);
  }, [open, quick, stage]);

  const close = () => {
    if (leaving || stage !== 'role' || !tappable) return;
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
  useEscape(close, open && stage === 'role' && !!me);

  useEffect(() => {
    if (!open || stage !== 'role') return;
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
  const skin = mapSkin(useStore.getState().room?.mapSlug);
  const info = skin.roles[me.role];
  const killer = me.faction === 'killer';

  return (
    <div className={`opening ${leaving ? 'leaving' : ''} ${flying ? 'to-card' : ''} ${quick ? 'quick' : ''} ${tappable ? 'tappable' : ''}`} onClick={stage === 'role' ? close : undefined}>
      {stage === 'prelude' && (
        <div className="opening-prelude" key="prelude" style={{ animationDelay: `${PRELUDE_MS - FADE_MS}ms` }}>
          {prelude.map((l, i) => (
            <p key={i} style={{ animationDelay: `${LINE_START_S + i * LINE_GAP_S}s` }}>
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
          <span className="faction">{killer ? `Phe ${skin.killerName.vi}` : skin.crewName.vi}</span>
          <h2>{info.name}</h2>
          {/* the opening only shows the gist (it is on screen briefly); full details on re-open from the HUD role card */}
          <p className="opening-desc">{quick ? info.desc : info.short}</p>
          {quick && (
            <>
              <p className="objective">
                <b>Mục tiêu:</b> {me.objective}
              </p>
              <p className="opening-tip">
                {killer ? (
                  isTouchDevice() ? <>Lại gần mục tiêu và bấm nút {skin.killButton?.label.vi ?? 'Hạ gục'}. Nhiệm vụ của bạn chỉ là giả.</> : <>Lại gần mục tiêu và bấm <kbd>K</kbd>. Nhiệm vụ của bạn chỉ là giả.</>
                ) : isTouchDevice() ? (
                  <>Làm nhiệm vụ ở các vòng sáng vàng. Thấy {(skin.phrases?.body?.vi ?? 'thi thể').toLowerCase()} thì bấm nút Báo cáo.{me.role === 'veteran_driver' && <> Bấm nút Soi lịch sử để xem hoạt động của một người.</>}</>
                ) : (
                  <>Làm nhiệm vụ ở các vòng sáng vàng. Thấy {(skin.phrases?.body?.vi ?? 'thi thể').toLowerCase()} thì bấm <kbd>L</kbd>.{me.role === 'veteran_driver' && <> Bấm <kbd>U</kbd> để soi một người.</>}</>
                )}
              </p>
            </>
          )}
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
          {!quick && tappable && <p className="opening-tap">{isTouchDevice() ? 'Chạm vào màn hình để vào hẻm' : 'Bấm chuột hoặc Enter để vào hẻm'}</p>}
        </div>
      )}
    </div>
  );
}
