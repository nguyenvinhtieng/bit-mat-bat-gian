import { useEffect, useRef, useState } from 'react';
import { sfx } from './minigames/kit';
import { AREA_RECTS, GAME, HUE_AREAS, canhMs as canhMsFor, HUE_NIGHT_START_HOUR, HUE_STATIONS, LAYOUT_H, LAYOUT_W, ROLE_INFO, type AreaId } from '@hidden-truth/shared';

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
import { Digits, Icon, RoleBadge, asset, fmt, useCountdown } from './common';
import { MapView } from './MapView';
import { isTouchDevice } from './Joystick';

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

/** Night-watch drum banner: shown (with the drum) each time a new canh begins. */
function CanhBanner() {
  const canh = useStore((s) => s.canh);
  const [show, setShow] = useState(false);
  useEffect(() => sfx.preloadDrum(), []);
  useEffect(() => {
    if (!canh) return;
    setShow(true);
    sfx.watch(canh.n);
    const t = setTimeout(() => setShow(false), 5200);
    return () => clearTimeout(t);
  }, [canh?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!canh || !show) return null;
  return (
    <div className={`canh-banner ${canh.n > GAME.canhCount ? 'dawn' : ''}`} key={canh.id}>
      <img src={asset('maps/co-do-hue/minigames/hue-ui-trong-canh.webp')} alt="" />
      <div>
        <b>
          {Array.from({ length: GAME.canhCount }, (_, i) => (
            <i key={i} className={i < canh.n ? 'on' : ''} />
          ))}
        </b>
        <span>{canh.text}</span>
      </div>
    </div>
  );
}

const CANH_NAMES = ['một', 'hai', 'ba', 'tư', 'năm'];
const CANH_NAMES_EN = ['I', 'II', 'III', 'IV', 'V'];

/** Night clock: 5 canh that run on time (paused during meetings). Elapsed is derived from synced timestamps. */
function useNight() {
  const room = useStore((s) => s.room)!;
  const offset = useStore((s) => s.timeOffset);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!room.nightStartAt) return null;
  const canhMs = canhMsFor(room.nightMin);
  const total = canhMs * GAME.canhCount;
  const elapsed = Math.min(total, Math.max(0, (room.nightPausedAt || now + offset) - room.nightStartAt));
  // in-game hour: canh một starts 19:00, each canh is 2 hours
  const mins = Math.floor((elapsed / canhMs) * 120);
  const h = (HUE_NIGHT_START_HOUR + Math.floor(mins / 60)) % 24;
  return {
    frac: elapsed / total,
    canh: Math.min(GAME.canhCount, Math.floor(elapsed / canhMs) + 1),
    clock: `${String(h).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
    left: Math.ceil((total - elapsed) / 1000),
    canhLeft: Math.ceil((canhMs - (elapsed % canhMs)) / 1000),
    paused: !!room.nightPausedAt,
  };
}

function NightBar({ pct, progress, target }: { pct: number; progress: number; target: number }) {
  const night = useNight();
  const t = useT();
  const en = t('canh') !== 'Canh';
  if (!night) return null;
  const last = night.canh === GAME.canhCount;
  return (
    <div className={`night-wrap ${last ? 'last' : ''} ${night.paused ? 'paused' : ''}`}>
      <div className="nw-row">
      <div className="night-clock" title={t('nightTitle')}>
        <img src={asset('maps/co-do-hue/minigames/hue-ui-trong-canh.webp')} width={26} height={26} alt="" />
        <span className="nc-canh">
          {t('canh')} {en ? CANH_NAMES_EN[night.canh - 1] : CANH_NAMES[night.canh - 1]}
        </span>
        <i className="nc-sep" aria-hidden />
        {night.paused ? (
          <span className="nc-left">{t('nightPaused')}</span>
        ) : (
          <span className="nc-left" title={t('nightLeftTitle')}>
            {t('nightLeft')} <b className="nc-time"><Digits text={fmt(night.left)} /></b>
          </span>
        )}
      </div>
      <div className="night-bar" title={`${t('canhLeft')}: ${fmt(night.canhLeft)}`}>
        {Array.from({ length: GAME.canhCount }, (_, i) => {
          const f = Math.min(1, Math.max(0, night.frac * GAME.canhCount - i));
          return (
            <div key={i} className={`nb-seg ${f >= 1 ? 'done' : f > 0 ? 'cur' : ''}`}>
              <i style={{ width: `${f * 100}%` }} />
              <span>{en ? CANH_NAMES_EN[i] : CANH_NAMES[i]}</span>
            </div>
          );
        })}
        <img className="nb-moon" src={asset('maps/co-do-hue/minigames/hue-mg-moon-4.webp')} alt="" style={{ left: `${night.frac * 100}%` }} />
      </div>
      </div>
      <div className="progress" title={t('progress')}>
        <div className="fill" style={{ width: `${pct}%` }} />
        <span>
          {t('progress')} · {progress}/{target} ({pct}%)
        </span>
      </div>
    </div>
  );
}

/** After dying: tell the player (once) that ghosts keep doing tasks — the crew still needs them before canh năm ends. */
function GhostNotice({ dead, crew }: { dead: boolean; crew: boolean }) {
  const phase = useStore((s) => s.room?.phase);
  const cinematic = useStore((s) => s.cinematic);
  const t = useT();
  const [state, setState] = useState<'none' | 'open' | 'seen'>('none');
  useEffect(() => {
    if (!dead) setState('none');
    else if (state === 'none' && phase === 'explore' && !cinematic) setState('open');
  }, [dead, phase, cinematic, state]);
  if (!dead || phase !== 'explore') return null;
  if (state !== 'open') return <div className="ghost-strip">{crew ? t('ghostStrip') : t('ghostStripKiller')}</div>;
  return (
    <div className="modal-backdrop ghost-backdrop">
      <div className="ghost-notice">
        <img src={asset('maps/co-do-hue/minigames/hue-ui-hon-ma.webp')} width={120} height={120} alt="" />
        <div className="ghost-body">
        <h2>{t('ghostTitle')}</h2>
        {crew ? (
          <>
            <p>{t('ghostBody1')}</p>
            <p className="ghost-em">{t('ghostBody2')}</p>
            <ul>
              <li>{t('ghostRule1')}</li>
              <li>{t('ghostRule2')}</li>
            </ul>
          </>
        ) : (
          <p>{t('ghostKillerBody')}</p>
        )}
        <button className="btn" autoFocus onClick={() => setState('seen')}>
          {crew ? t('ghostGo') : t('close')}
        </button>
        </div>
      </div>
    </div>
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
  const en = t('canh') !== 'Canh';
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
  const taskOpen = useStore((s) => !!s.task);
  // phones start with the task list folded so the left thumb (joystick) has room
  const [tasksOpen, setTasksOpen] = useState(() => !isTouchDevice());
  const exploring = !!me && inGame && room.phase === 'explore';
  useEffect(() => {
    if (!exploring) return;
    const h = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (e.repeat || (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'))) return;
      if (useStore.getState().task || useStore.getState().introOpen) return;
      if (e.code === 'KeyM') setMapOpen((v) => !v);
      else if (e.code === 'KeyT') setTasksOpen((v) => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [exploring]);
  useEffect(() => {
    if (!exploring) setMapOpen(false);
  }, [exploring]);
  const pendingAreas = new Set<AreaId>(
    (me?.tasks ?? [])
      .filter((id) => !me!.completedTasks.includes(id))
      .map((id) => HUE_STATIONS.find((x) => x.id === id)!.area),
  );

  const touch = isTouchDevice();
  const taskItems = me && (
          <ul>
            {me.tasks.map((id) => {
              const st = HUE_STATIONS.find((x) => x.id === id)!;
              const done = me.completedTasks.includes(id);
              const here = st.area === area && !done;
              return (
                <li key={id} className={`${done ? 'done' : ''} ${here ? 'here' : ''}`}>
                  <i className="tick">{done ? '✔' : ''}</i>
                  <span>
                    {en ? st.titleEn : st.title}
                    <small className="task-where">📍 {en ? HUE_AREAS[st.area].nameEn : HUE_AREAS[st.area].name}</small>
                  </span>
                </li>
              );
            })}
          </ul>
  );

  return (
    <>
      {inGame && <CanhBanner />}
      {/* top centre: the (small) location plate on top, night clock + progress under it */}
      <div className="hud-top">
        {area && (
          <div className="area-name" key={area}>
            <span>{HUE_AREAS[area].name}</span>
          </div>
        )}
        {inGame && room.phase !== 'ended' && <NightBar pct={pct} progress={room.progress} target={room.progressTarget} />}
        {inGame && left != null && (
          <div className="hud-status">
            <span className="timer">
              <Icon name="timer" size={20} /> <Digits text={fmt(left)} />
            </span>
          </div>
        )}
      </div>
      {/* top right: who is still standing */}
      {inGame && room.phase !== 'ended' && room.crewAlive + room.killersAlive > 0 && (
        <div className="alive-count" title={t('aliveTitle')}>
          <span className="ac crew" key={`c${room.crewAlive}`}>
            <img src={asset('common/ui/count-crew.webp')} alt="" draggable={false} />
            <b>{room.crewAlive}</b>
            <small>{t('crewAlive')}</small>
          </span>
          <i className="ac-sep" aria-hidden />
          <span className="ac killer" key={`k${room.killersAlive}`}>
            <img src={asset('common/ui/count-killer.webp')} alt="" draggable={false} />
            <b>{room.killersAlive}</b>
            <small>{t('killersAlive')}</small>
          </span>
        </div>
      )}

      {me && inGame && <GhostNotice dead={!alive} crew={me.faction === 'crew'} />}

      {me && inGame && (
        <button className={`role-card ${me.faction}`} onClick={() => set({ introOpen: true, introQuick: true })} title={t('roleGoal')}>
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
        </button>
      )}

      {mapOpen && <MapView current={area} pos={pos} onClose={() => setMapOpen(false)} />}

      {me && inGame && room.phase === 'explore' && (
        <div className="hud-left">
          <button className="minimap-btn" onClick={() => setMapOpen(true)} title={`${t('map')} (M)`}>
            <MiniMap current={area} pending={pendingAreas} pos={pos} />
            <span className="minimap-cap">
              {t('map')} <kbd>M</kbd>
            </span>
          </button>
          {/* phones always, desktop when folded: just the notebook chip, so a closed list never blocks the view */}
          {touch || !tasksOpen ? (
            <button className="task-chip" onClick={() => setTasksOpen(true)} title={touch ? t('myTasks') : `${t('myTasks')} (T)`}>
              <img src={asset('common/ui/notebook.webp')} alt="" draggable={false} />
              <b>
                {me.completedTasks.length}/{me.tasks.length}
              </b>
              {!touch && <kbd className="task-chip-key">T</kbd>}
            </button>
          ) : (
          <div className={`task-list ${tasksOpen ? 'open' : 'closed'}`}>
            <button className="task-head" onClick={() => setTasksOpen(!tasksOpen)} aria-expanded={tasksOpen} title={`${tasksOpen ? t('hide') : t('show')} (T)`}>
              <span className="task-head-title">{t('myTasks')}</span>
              <b className="task-count">
                {me.completedTasks.length}/{me.tasks.length}
              </b>
              <span className="task-toggle" aria-hidden>
                <kbd>T</kbd>
                <i className="chev" />
              </span>
            </button>
            <div className="task-meter">
              <div style={{ width: `${(me.completedTasks.length / Math.max(1, me.tasks.length)) * 100}%` }} />
            </div>
            {tasksOpen && killer && <p className="task-note">{t('fakeTasks')}</p>}
            {tasksOpen && taskItems}
          </div>
          )}
        </div>
      )}
      {me && inGame && room.phase === 'explore' && touch && tasksOpen && !taskOpen && (
        <div className="modal-backdrop task-pop-backdrop" onClick={() => setTasksOpen(false)}>
          <div className="task-list task-pop open" onClick={(e) => e.stopPropagation()}>
            <div className="task-pop-head">
              <span className="task-head-title">{t('myTasks')}</span>
              <b className="task-count">
                {me.completedTasks.length}/{me.tasks.length}
              </b>
              <button className="task-pop-x" onClick={() => setTasksOpen(false)} aria-label={t('close')}>
                ✕
              </button>
            </div>
            <div className="task-meter">
              <div style={{ width: `${(me.completedTasks.length / Math.max(1, me.tasks.length)) * 100}%` }} />
            </div>
            {killer && <p className="task-note">{t('fakeTasks')}</p>}
            {taskItems}
            <button
              className="btn task-pop-map"
              onClick={() => {
                setTasksOpen(false);
                setMapOpen(true);
              }}
            >
              🗺 {t('map')}
            </button>
          </div>
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
              {cdLeft ? <span className="cd"><Digits text={cdLeft} /></span> : null}
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

      {/* tasks get an in-world "tap" badge over the station (GameScene) — the pill is for report / bell only */}
      {nearby && nearby.kind !== 'task' && room.phase === 'explore' && (
        <button
          className={`interact ${nearby.kind}`}
          onClick={() => {
            if (nearby.kind === 'report') send('report', {});
            else send('emergency', {});
          }}
        >
          <kbd>E</kbd>
          {nearby.kind === 'emergency' && <Icon name="meeting-bell" size={22} />}
          {nearby.title}
          {nearby.kind === 'emergency' && nearby.used && t('used')}
        </button>
      )}
    </>
  );
}
