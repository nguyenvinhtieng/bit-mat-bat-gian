import { useEffect, useState } from 'react';
import { HUE_INTRO, HUE_STORY_TITLE, ROLE_INFO, mapArt } from '@hidden-truth/shared';
import { useStore } from '../store';
import { RoleBadge, asset } from './common';

const LINE_GAP = 1.9; // seconds between story lines
const LINES = HUE_INTRO.split(/(?<=[.!?])\s+/).filter(Boolean);

/** Cinematic opening: fade to dark -> story lines -> role reveal -> fade into the festival night. */
export function IntroModal() {
  const open = useStore((s) => s.introOpen);
  const me = useStore((s) => s.me);
  const quick = useStore((s) => s.introQuick);
  const set = useStore((s) => s.set);
  const mapSlug = useStore((s) => s.room?.mapSlug ?? 'co-do-hue');
  const [stage, setStage] = useState<'story' | 'role'>('story');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStage(quick ? 'role' : 'story');
      setLeaving(false);
    }
  }, [open]);

  // auto-advance from story to role once all lines have been shown
  useEffect(() => {
    if (!open || stage !== 'story') return;
    const t = setTimeout(() => setStage('role'), (LINES.length * LINE_GAP + 2.2) * 1000);
    return () => clearTimeout(t);
  }, [open, stage]);

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => set({ introOpen: false }), 600);
  };
  const next = () => (stage === 'story' ? setStage('role') : close());

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (!open || !me) return null;
  const info = ROLE_INFO[me.role];
  const killer = me.faction === 'killer';

  return (
    <div className={`opening ${leaving ? 'leaving' : ''} ${quick ? 'quick' : ''}`} onClick={next}>
      {stage === 'story' ? (
        <div className="opening-story" key="story">
          <img className="opening-art" src={asset(mapArt(mapSlug, 'home-bg'))} alt="" />
          <h1 className="opening-title">{HUE_STORY_TITLE}</h1>
          <div className="opening-lines">
            {LINES.map((l, i) => (
              <p key={i} style={{ animationDelay: `${1.2 + i * LINE_GAP}s` }}>
                {l}
              </p>
            ))}
          </div>
          <span className="opening-hint">Bấm để tiếp tục</span>
        </div>
      ) : (
        <div className={`opening-role ${me.faction}`} key="role">
          <span className="opening-eyebrow">Vai trò của bạn</span>
          <div className="opening-badge">
            <RoleBadge role={me.role} size={140} />
          </div>
          <span className="faction">{killer ? 'Phe Hắc Ảnh' : 'Phe Người Dân'}</span>
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
          <button
            className="btn primary big"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            Vào Đêm Hội
          </button>
        </div>
      )}
    </div>
  );
}
