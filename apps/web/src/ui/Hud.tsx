import { HUE_AREAS, HUE_ROLE_STATIONS, ROLE_INFO, type AreaId } from '@hidden-truth/shared';
import { send } from '../net';
import { useStore } from '../store';
import { Icon, RoleBadge, fmt, useCountdown } from './common';

export function Hud() {
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.me);
  const nearby = useStore((s) => s.nearby);
  const area = useStore((s) => s.area) as AreaId | '';
  const set = useStore((s) => s.set);
  const sessionId = useStore((s) => s.sessionId);
  const left = useCountdown(room.phaseEndsAt);
  const pct = Math.min(100, Math.round((room.progress / Math.max(1, room.progressTarget)) * 100));
  const isHost = room.hostId === sessionId;
  const inGame = room.phase !== 'lobby';

  return (
    <>
      <div className="hud-top">
        {area && <div className="area-name">{HUE_AREAS[area].name}</div>}
        {inGame && (
          <div className="hud-status">
            <span className="round">
              Vòng {room.round}/{room.maxRounds}
            </span>
            <span className="timer">
              <Icon name="timer" size={20} /> {fmt(left)}
            </span>
            {isHost && room.phase === 'explore' && (
              <button className="btn small ghost" onClick={() => send('host:skip', {})} title="Host: kết thúc vòng ngay">
                ⏭
              </button>
            )}
          </div>
        )}
      </div>

      {inGame && (
        <div className="progress-wrap" title="Tiến độ triển lãm">
          <Icon name="progress-star" size={22} />
          <div className="progress">
            <div className="fill" style={{ width: `${pct}%` }} />
            <span>
              Tiến độ triển lãm {room.progress}/{room.progressTarget}
            </span>
          </div>
        </div>
      )}

      {me && (
        <div className={`role-card ${me.faction}`}>
          <RoleBadge role={me.role} size={48} />
          <div>
            <strong>{ROLE_INFO[me.role].name}</strong>
            <span className="faction">{me.faction === 'secret' ? 'Phe Bí Mật' : 'Phe Điều Tra'}</span>
            <span className="ability">
              {ROLE_INFO[me.role].ability} · {me.abilityUsedRound >= room.round ? 'đã dùng vòng này' : `tại ${HUE_AREAS[HUE_ROLE_STATIONS[me.role].area].name}`}
            </span>
          </div>
        </div>
      )}

      {me && (
        <div className="hud-buttons">
          <button className="btn icon-btn" onClick={() => set({ notebookOpen: true })}>
            <Icon name="notebook" size={28} />
            Sổ manh mối ({me.notebook.length})
          </button>
          <button className="btn icon-btn ghost" onClick={() => set({ introOpen: true })}>
            <Icon name="clue" size={28} />
            Vai & mục tiêu
          </button>
        </div>
      )}

      {nearby && room.phase === 'explore' && (
        <button
          className={`interact ${nearby.kind}`}
          onClick={() => {
            if (nearby.kind === 'task') send('task:open', { taskId: nearby.id });
            else if (nearby.kind === 'ability') send('ability:open', {});
            else send('emergency', {});
          }}
        >
          <kbd>E</kbd>
          {nearby.kind === 'emergency' && <Icon name="meeting-bell" size={22} />}
          {nearby.title}
          {nearby.kind === 'task' && nearby.done && ' ✓'}
          {nearby.kind !== 'task' && nearby.used && ' (đã dùng)'}
        </button>
      )}
    </>
  );
}
