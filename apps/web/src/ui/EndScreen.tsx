import { useEffect, useRef } from 'react';
import { PLAYER_COLORS, mapSkin } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { colorHex, useStore } from '../store';
import { RoleBadge } from './common';

export function EndScreen() {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
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
  // the first one to leave the results brings the room back to its lobby; everyone closes their own screen
  const backToLobby = () => {
    if (room.phase === 'ended') send('lobby:return', {});
    useStore.getState().set({ end: null });
  };
  return (
    <div ref={dialogRef} tabIndex={-1} className={`end-screen ${end.winner}`} onKeyDown={(e) => {
      if (e.key !== 'Tab') return;
      const targets = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, summary:not([tabindex="-1"])'));
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }} role="dialog" aria-modal="true" aria-labelledby="end-title" aria-describedby="end-reason">
      <div className="end-card">
        <div className="end-hero">
          <div className="end-summary">
            <span className="end-eyebrow">Ván chơi đã kết thúc</span>
            <span className="end-winner-mark" aria-hidden="true">
              <svg viewBox="0 0 120 64" fill="none">
                <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path className="end-laurel" d="M35 55C15 49 13 29 24 15M24 43l-10-5m8-3-9-8m10 0-5-10m67 38c20-6 22-26 11-40m0 28 10-5m-8-3 9-8m-10 0 5-10" />
                  <path d="m10 11 1-4 1 4 4 1-4 1-1 4-1-4-4-1 4-1Zm98 39 1-4 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" fill="currentColor" stroke="none" />
                  {crewWins ? <>
                    <path d="M47 15h26v14a13 13 0 0 1-26 0V15Z" fill="currentColor" fillOpacity=".18" />
                    <path d="M47 19h-8v7a10 10 0 0 0 12 10m22-17h8v7a10 10 0 0 1-12 10M60 42v9m-10 4h20m-17-4h14" />
                    <path d="m60 21 2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5 2-5Z" fill="currentColor" stroke="none" />
                  </> : <>
                    <path d="m60 11 18 7v15c0 10-10 18-18 22-8-4-18-12-18-22V18l18-7Z" fill="currentColor" fillOpacity=".18" />
                    <path d="m60 21 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" fill="currentColor" />
                  </>}
                </g>
              </svg>
            </span>
            <h1 id="end-title">{winnerName}<span>chiến thắng!</span></h1>
            <p id="end-reason" className="end-reason">{reason}</p>
            <div className="end-stats" aria-label="Thông tin ván chơi">
              <span><b>{end.roles.length}</b> người chơi</span>
              <span><b>{officers}</b> công an chìm</span>
            </div>
          </div>
        </div>

        {/* Keep the role reveal open on every screen size. */}
        <details className="end-reveal always-open" open>
          <summary className="end-section-heading" tabIndex={-1} onClick={(e) => e.preventDefault()}>Xem vai trò cả hội <span>{end.roles.length} người chơi</span></summary>
          <div className="role-list" role="region" aria-label="Vai trò người chơi">
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

        <div className="end-actions">
          <button className="btn primary" onClick={backToLobby}>
            Về sảnh · Chơi tiếp
          </button>
          <button className="btn ghost" onClick={leaveRoom}>
            Rời phòng
          </button>
        </div>
      </div>
    </div>
  );
}
