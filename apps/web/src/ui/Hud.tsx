import { useRef, useState } from 'react';
import { AREA_RECTS, HUE_AREAS, HUE_STATIONS, LAYOUT_H, LAYOUT_W, ROLE_INFO, type AreaId } from '@hidden-truth/shared';

function MiniMap({ current, pending, pos, big, onClick }: { current: AreaId | ''; pending: Set<AreaId>; pos: { x: number; y: number } | null; big?: boolean; onClick?: () => void }) {
  const ids = Object.keys(AREA_RECTS) as AreaId[];
  return (
    <svg className={`minimap ${big ? 'big' : 'mini'}`} onClick={onClick} viewBox={`0 0 ${LAYOUT_W} ${LAYOUT_H}`}>
      {ids.map((id) => {
        const cls = `mm-area ${id === current ? 'cur' : pending.has(id) ? 'todo' : ''}`;
        return AREA_RECTS[id].map(([x, y, w, h], i) => (
          <rect key={`${id}${i}`} className={cls} x={x} y={y} width={w} height={h} />
        ));
      })}
      {big &&
        ids
        .filter((id) => id !== 'corridor')
        .map((id) => {
          const [x, y, w, h] = AREA_RECTS[id][0];
          return (
            <text key={id} className="mm-label" x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle">
              {HUE_AREAS[id].name}
            </text>
          );
        })}
      {pos && (
        <g className="mm-me">
          <circle cx={pos.x} cy={pos.y} r={big ? 1.6 : 2.2} className="mm-pulse" />
          <circle cx={pos.x} cy={pos.y} r={big ? 0.9 : 1.3} className="mm-dot" />
        </g>
      )}
    </svg>
  );
}
import { send } from '../net';
import { useStore } from '../store';
import { useT } from '../i18n';
import { Icon, RoleBadge, asset, fmt, useCountdown } from './common';

/** Sweeping ring over a round button: fills clockwise from 0 to 100% while the cooldown runs (pure CSS animation, no re-render). */
function CooldownRing({ readyAt }: { readyAt: number }) {
  const offset = useStore((s) => s.timeOffset);
  // length of this cooldown is captured when it starts; timing is frozen so re-renders do not shift the CSS timeline
  const span = useRef<{ at: number; style: React.CSSProperties }>({ at: 0, style: {} });
  if (span.current.at !== readyAt) {
    const left = Math.max(0, readyAt - (Date.now() + offset));
    const total = Math.max(left, 1);
    span.current = { at: readyAt, style: { animationDuration: `${total}ms`, animationDelay: `${-(total - left)}ms` } };
  }
  const { style } = span.current;
  return (
    <svg className="cd-ring" viewBox="0 0 100 100" key={readyAt} aria-hidden>
      <circle className="cd-shade" cx="50" cy="50" r="38" />
      <circle className="cd-track" cx="50" cy="50" r="44" />
      <circle className="cd-arc" cx="50" cy="50" r="44" pathLength="100" style={style} />
      <g className="cd-head" style={style}>
        <circle cx="50" cy="6" r="4.5" />
      </g>
    </svg>
  );
}

export function Hud() {
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.me);
  const nearby = useStore((s) => s.nearby);
  const killTarget = useStore((s) => s.killTarget);
  const area = useStore((s) => s.area) as AreaId | '';
  const set = useStore((s) => s.set);
  const t = useT();
  const sessionId = useStore((s) => s.sessionId);
  const left = useCountdown(room.phaseEndsAt);
  const cdLeft = useCountdown(me?.killReadyAt ?? 0);
  const pct = Math.min(100, Math.round((room.progress / Math.max(1, room.progressTarget)) * 100));
  const inGame = room.phase !== 'lobby';
  const mine = room.players.find((p) => p.id === sessionId);
  const alive = mine?.alive !== false;
  const killer = me?.faction === 'killer';
  const pos = useStore((s) => s.pos);
  const killReady = killer && killTarget && !cdLeft;
  const canReport = nearby?.kind === 'report';
  const [mapOpen, setMapOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const pendingAreas = new Set<AreaId>(
    (me?.tasks ?? [])
      .filter((id) => !me!.completedTasks.includes(id))
      .map((id) => HUE_STATIONS.find((x) => x.id === id)!.area),
  );

  return (
    <>
      <div className="hud-top">
        {area && (
          <div className="area-name" key={area}>
            <span>{HUE_AREAS[area].name}</span>
          </div>
        )}
        {inGame && left != null && (
          <div className="hud-status">
            <span className="timer">
              <Icon name="timer" size={20} /> {fmt(left)}
            </span>
          </div>
        )}
      </div>

      {inGame && room.phase !== 'ended' && (
        <div className="progress-wrap" title={t('progress')}>
          <Icon name="progress-star" size={22} />
          <div className="progress">
            <div className="fill" style={{ width: `${pct}%` }} />
            <span>
              {t('progress')} {room.progress}/{room.progressTarget} ({pct}%)
            </span>
          </div>
        </div>
      )}

      {me && inGame && (
        <div className={`role-card ${me.faction}`}>
          <RoleBadge role={me.role} size={48} />
          <div>
            <strong>{ROLE_INFO[me.role].name}</strong>
            <span className="faction">{killer ? t('killerFaction') : t('crewFaction')}</span>
            <span className="ability">
              {!alive ? (
                t('ghost')
              ) : me.role === 'guardian' ? (
                <>
                  <img className={`shield-pip ${me.shield ? 'on' : 'off'}`} src={asset('common/ui/shield.webp')} alt="" draggable={false} />
                  {me.shield ? t('shieldOn') : t('shieldOff')}
                </>
              ) : (
                ROLE_INFO[me.role].short
              )}
            </span>
            {killer && me.mates && me.mates.length > 0 && <span className="ability">{t('mates')}: {me.mates.join(', ')}</span>}
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="map-popup" onClick={() => setMapOpen(false)}>
          <div className="map-popup-card" onClick={(e) => e.stopPropagation()}>
            <button className="map-close" onClick={() => setMapOpen(false)}>✕</button>
            <MiniMap big current={area} pending={pendingAreas} pos={pos} />
          </div>
        </div>
      )}

      {me && inGame && room.phase === 'explore' && (
        <div className="hud-left">
          <div className="hud-left-btns">
            <button className="chip" onClick={() => setMapOpen(true)}>
              🗺️ {t('map')}
            </button>
            <button className={`chip ${tasksOpen ? 'on' : ''}`} onClick={() => setTasksOpen(!tasksOpen)}>
              📋 {t('tasksToggle')} {me.completedTasks.length}/{me.tasks.length}
            </button>
          </div>
          <MiniMap current={area} pending={pendingAreas} pos={pos} onClick={() => setMapOpen(true)} />
          {tasksOpen && (
        <div className="task-list">
          <h5>{killer ? t('fakeTasks') : t('myTasks')}</h5>
          <ul>
            {me.tasks.map((id) => {
              const st = HUE_STATIONS.find((x) => x.id === id)!;
              const done = me.completedTasks.includes(id);
              return (
                <li key={id} className={done ? 'done' : ''}>
                  {done ? '✔' : '○'} {st.title}
                  <small>{HUE_AREAS[st.area].name}</small>
                </li>
              );
            })}
          </ul>
        </div>
          )}
        </div>
      )}

      {me && (
        <div className="hud-buttons">
          <button className="btn icon-btn ghost" onClick={() => set({ introOpen: true, introQuick: true })}>
            <Icon name="clue" size={28} />
            {t('roleGoal')}
          </button>
        </div>
      )}

      {room.phase === 'explore' && alive && (
        <div className="action-bar">
          {killer && (
            <button
              className={`round-btn kill ${killReady ? 'ready' : 'idle'} ${cdLeft ? 'cooling' : ''}`}
              disabled={!killReady}
              onClick={() => send('kill', {})}
              title={`${t('kill')} (K)`}
              aria-label={t('kill')}
            >
              <img src={asset('common/ui/btn-kill.webp')} alt="" draggable={false} />
              {cdLeft ? <CooldownRing readyAt={me!.killReadyAt ?? 0} /> : null}
              {cdLeft ? <span className="cd">{cdLeft}</span> : null}
              <kbd>K</kbd>
              <em>{t('kill')}</em>
            </button>
          )}
          <button
            className={`round-btn report ${canReport ? 'ready' : 'idle'}`}
            disabled={!canReport}
            onClick={() => send('report', {})}
            title={`${t('report')} (R)`}
            aria-label={t('report')}
          >
            <img src={asset('common/ui/btn-report.webp')} alt="" draggable={false} />
            <kbd>R</kbd>
            <em>{t('report')}</em>
          </button>
        </div>
      )}

      {nearby && room.phase === 'explore' && (
        <button
          className={`interact ${nearby.kind}`}
          onClick={() => {
            if (nearby.kind === 'task') send('task:open', { taskId: nearby.id });
            else if (nearby.kind === 'report') send('report', {});
            else send('emergency', {});
          }}
        >
          <kbd>E</kbd>
          {nearby.kind === 'emergency' && <Icon name="meeting-bell" size={22} />}
          {nearby.title}
          {nearby.kind === 'task' && nearby.done && ' ✓'}
          {nearby.kind === 'emergency' && nearby.used && t('used')}
        </button>
      )}
    </>
  );
}
