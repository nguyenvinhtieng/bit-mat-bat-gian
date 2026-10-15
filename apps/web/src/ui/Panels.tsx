import { useEffect, useState } from 'react';
import { HUE_INTRO, HUE_STORY_SUBTITLE, HUE_STORY_TITLE, ROLE_INFO, mapArt } from '@hidden-truth/shared';
import { useStore } from '../store';
import { RoleBadge, asset, useEscape } from './common';

const LINE_GAP = 1.9; // seconds between story lines
const LINES = HUE_INTRO.split(/(?<=[.!?])\s+/).filter(Boolean);
// last line starts at 1.2 + (n-1)*gap and its fade-in lasts 1.1s; then a short beat before the role
const STORY_MS = (1.2 + (LINES.length - 1) * LINE_GAP + 1.1 + 0.8) * 1000;
const ROLE_MS = 5000; // role reveal is held this long before everyone drops into the game together

/** Cinematic opening: fade to dark -> story lines -> role reveal -> fade into the festival night. */
export function IntroModal() {
  const open = useStore((s) => s.introOpen);
  const me = useStore((s) => s.me);
  const quick = useStore((s) => s.introQuick);
  const set = useStore((s) => s.set);
  const mapSlug = useStore((s) => s.room?.mapSlug ?? 'co-do-hue');
  const [stage, setStage] = useState<'story' | 'role' | 'game'>('story');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStage(quick ? 'role' : 'story');
      setLeaving(false);
    }
  }, [open]);

  // the opening is not skippable so all players enter at the same moment: story -> role -> game
  useEffect(() => {
    if (!open || quick) return;
    const t = setTimeout(() => setStage(stage === 'story' ? 'role' : 'game'), stage === 'story' ? STORY_MS : ROLE_MS);
    return () => clearTimeout(t);
  }, [open, quick, stage]);
  useEffect(() => {
    if (stage === 'game') close();
  }, [stage]);

  const close = () => {
    if (leaving) return;
    setLeaving(true);
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
    <div className={`opening ${leaving ? 'leaving' : ''} ${quick ? 'quick' : ''}`} onClick={quick ? close : undefined}>
      {stage === 'story' ? (
        <div className="opening-story" key="story">
          <img className="opening-art" src={asset(mapArt(mapSlug, 'home-bg'))} alt="" />
          <h1 className="opening-title">{HUE_STORY_TITLE}</h1>
          <span className="opening-subtitle">{HUE_STORY_SUBTITLE}</span>
          <div className="opening-lines">
            {LINES.map((l, i) => (
              <p key={i} style={{ animationDelay: `${1.2 + i * LINE_GAP}s` }}>
                {l}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className={`opening-role ${me.faction}`} key="role">
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
