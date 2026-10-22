import { useSyncExternalStore } from 'react';
import { PLAYER_COLORS, mapSkin } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { colorHex, useStore } from '../store';
import { RoleBadge, asset } from './common';

// same breakpoint as the full-viewport mobile layout in styles.css: phones keep the role list folded
const MOBILE_QUERY = '(max-width: 640px), (max-width: 960px) and (max-height: 500px)';
const subscribeMobile = (cb: () => void) => {
  const mq = matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const isMobileLayout = () => matchMedia(MOBILE_QUERY).matches;

export function EndScreen() {
  const mobile = useSyncExternalStore(subscribeMobile, isMobileLayout);
  const end = useStore((s) => s.end);
  const room = useStore((s) => s.room);
  if (!end || !room) return null;
  const skin = mapSkin(room.mapSlug);
  const crewWins = end.winner === 'crew';
  const winnerName = crewWins ? skin.crewName.vi : skin.killerName.vi;
  const shortReasons = [
    [skin.story.endings.tasks, 'Giao hàng thành công!'],
    [skin.story.endings.vote, 'Đã tìm ra công an chìm!'],
    [skin.story.endings.killer, 'Toàn bộ tài xế đã bị bắt.'],
    [skin.story.endings.timeout, 'Hết giờ giao hàng. Chuyến hàng bị hủy.'],
  ];
  const reason = shortReasons.find(([full]) => full === end.reason)?.[1] ?? end.reason;
  const officers = end.roles.filter((r) => r.faction === 'killer').length;
  // the first one to leave the results brings the room back to its lobby; later ones just close their own screen
  const backToLobby = () => (room.phase === 'ended' ? send('lobby:return', {}) : useStore.getState().set({ end: null }));
  return (
    <div className={`end-screen ${end.winner}`} role="dialog" aria-modal="true" aria-labelledby="end-title" aria-describedby="end-reason">
      <div className="end-card">
        <div className="end-hero">
          <div className="end-art">
            <img className="end-emblem" src={asset(`maps/game/ui/end/victory-${end.winner}-v2.webp`)} alt={crewWins ? 'Hội tài xế vui mừng bên kiện hàng trong hẻm Sài Gòn' : 'Công an chìm giơ thẻ ngành trước các tài xế trong hẻm'} draggable={false} fetchPriority="high" />
            <span className="end-scene-label">HẺM 42 · CUỐC CUỐI</span>
          </div>
          <div className="end-summary">
            <span className="end-eyebrow">Ván chơi đã kết thúc</span>
            <span className="end-winner-mark" aria-hidden="true">{crewWins ? '★' : '✓'}</span>
            <h1 id="end-title">{winnerName}<span>chiến thắng!</span></h1>
            <p id="end-reason" className="end-reason">{reason}</p>
            <div className="end-stats" aria-label="Thông tin ván chơi">
              <span><b>{end.roles.length}</b> người chơi</span>
              <span><b>{officers}</b> công an chìm</span>
            </div>
          </div>
        </div>

        <div className="end-actions">
          <button className="btn primary" onClick={backToLobby}>
            Về sảnh · Chơi tiếp
          </button>
          <button className="btn ghost" onClick={leaveRoom}>
            Rời phòng
          </button>
        </div>

        {/* desktop has room for the whole list: always open, no toggle */}
        <details className={`end-reveal${mobile ? '' : ' always-open'}`} open={mobile ? undefined : true}>
          <summary className="end-section-heading" tabIndex={mobile ? undefined : -1} onClick={mobile ? undefined : (e) => e.preventDefault()}>Xem vai trò cả hội <span>{end.roles.length} người chơi</span></summary>
          <div className="role-list" role="region" aria-label="Vai trò người chơi" tabIndex={0}>
            {/* the cop first so the reveal is the first thing everyone reads */}
            {[...end.roles].sort((a, b) => Number(b.faction === 'killer') - Number(a.faction === 'killer')).map((r, i) => (
              <div
                key={i}
                className={`role-row ${r.faction} ${r.alive ? '' : 'dead'}`}
                style={{ '--pc': colorHex(PLAYER_COLORS[r.color] ?? 0xffffff) } as React.CSSProperties}
              >
                <div className="role-row-avatar">
                  <RoleBadge role={r.role} size={44} />
                  {!r.alive && <span className="role-row-status" aria-label="Đã rời ván">–</span>}
                </div>
                <div className="role-row-main">
                  <b title={r.name}>{r.name}</b>
                  <span className="role-row-role">{skin.roles[r.role].name}</span>
                  <span className="role-row-state">{r.alive ? 'Còn trong ván' : 'Đã rời ván'}</span>
                </div>
                {r.faction === 'killer' ? <em className="tag killer-tag">Công an chìm</em> : <em className="tag crew-tag">{r.tasksDone} nhiệm vụ</em>}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
