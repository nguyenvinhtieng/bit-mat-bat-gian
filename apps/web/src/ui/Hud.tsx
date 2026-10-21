import { useEffect, useRef, useState } from 'react';
import { sfx } from './minigames/common/kit';
import { AREA_RECTS, GAME, PREP_TASK_IDS, LAYOUT_H, LAYOUT_W, TILE, type AreaId, type TaskId } from '@hidden-truth/shared';

function MiniMap({ current, pending, pos, big, onClick }: { current: AreaId | ''; pending: Set<AreaId>; pos: { x: number; y: number } | null; big?: boolean; onClick?: () => void }) {
  const skin = useSkin();
  const pkg = usePackageSpot();
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
              {skin.areas[id].name}
            </text>
          );
        })}
      {pkg && (
        <g className="mm-ward">
          <circle cx={pkg.x / TILE} cy={pkg.y / TILE} r={2.6} className="mm-ward-pulse" />
          <circle cx={pkg.x / TILE} cy={pkg.y / TILE} r={1.2} className="mm-ward-dot" />
        </g>
      )}
      {pos && (
        <g className="mm-me">
          <circle cx={pos.x} cy={pos.y} r={big ? 1.6 : 2.2} className="mm-pulse" />
          <circle cx={pos.x} cy={pos.y} r={big ? 0.9 : 1.3} className="mm-dot" />
        </g>
      )}
    </svg>
  );
}
import { arrest, send } from '../net';
import { colorHex, uiBlocksMovement, useStore } from '../store';
import { useLang, useT } from '../i18n';
import { CloseButton, Digits, Icon, RoleBadge, asset, fmt, tapProps, useCountdown, usePackageSpot, useSkin } from './common';
import { MapView } from './MapView';
import { GameSettings } from './GameSetting';
import { VoiceControls } from './VoiceControls';
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

/** Notices under the top HUD: an arrest hold involving me, and "you carry the package". */
function HoldNotice() {
  const hold = useStore((s) => s.arrestHold);
  const t = useT();
  const left = useCountdown(hold?.endsAt ?? 0);
  useEffect(() => {
    if (hold?.youAre === 'target') sfx.bad();
  }, [hold?.endsAt, hold?.youAre]);
  if (!hold) return null;
  const target = hold.youAre === 'target';
  return (
    <div className={`notice arrest-alert ${target ? 'urgent' : ''}`} role="alert" key={hold.endsAt}>
      <span className="notice-ico">🚨</span>
      <div className="notice-body">
        <b>{target ? t('arrestingYou').replace('{name}', hold.by ?? '?') : t('arresting')}</b>
        <span>{target ? t('arrestRun') : t('arrestKeep')}</span>
      </div>
      {left != null && (
        <span className="notice-timer">
          <Digits text={left} />
        </span>
      )}
    </div>
  );
}

function CarryNotice() {
  const mine = useStore((s) => !!s.room && s.room.packageState === 'carried' && s.room.packageCarrier === s.sessionId);
  const open = useStore((s) => !!s.room?.handoffOpen);
  const t = useT();
  if (!mine) return null;
  return (
    <div className="notice carry-notice">
      <span className="notice-ico">📦</span>
      <div className="notice-body">
        <b>{t('carrying')}</b>
        <span>{open ? t('carryGo') : t('carryWait')}</span>
      </div>
    </div>
  );
}

/** One countdown (paused during meetings); the fictional clock runs 23:42 -> 05:00 over it. */
function useClock() {
  const skin = useSkin();
  const room = useStore((s) => s.room)!;
  const offset = useStore((s) => s.timeOffset);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!room.nightStartAt) return null;
  const total = room.nightMin * 60_000;
  const elapsed = Math.min(total, Math.max(0, (room.nightPausedAt || now + offset) - room.nightStartAt));
  const { startMin, endMin } = skin.story.clock;
  const mins = startMin + Math.floor((elapsed / total) * (endMin - startMin));
  const h = Math.floor(mins / 60) % 24;
  const left = Math.ceil((total - elapsed) / 1000);
  return {
    frac: elapsed / total,
    clock: `${String(h).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
    left,
    last: left <= 60,
    paused: !!room.nightPausedAt,
  };
}

/** "05:00 · còn lại mm:ss" pill; on touch screens it sits in the right column under the role card. */
function NightClock({ night }: { night: NonNullable<ReturnType<typeof useClock>> }) {
  const skin = useSkin();
  const t = useT();
  return (
    <div className="night-clock" title={t('nightTitle')}>
      <img src={asset(`${skin.art.clockIcon}.webp`)} width={26} height={26} alt="" />
      <span className="nc-canh">
        <Digits text={night.clock} />
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
  );
}

/** Touch screens: the clock on its own, with the same last-minute / paused styling as the top strip. */
function NightClockDock() {
  const night = useClock();
  if (!night) return null;
  return (
    <div className={`night-wrap ${night.last ? 'last' : ''} ${night.paused ? 'paused' : ''}`}>
      <NightClock night={night} />
    </div>
  );
}

function NightBar({ pct, progress, target, open }: { pct: number; progress: number; target: number; open: boolean }) {
  const skin = useSkin();
  const night = useClock();
  const t = useT();
  const touch = isTouchDevice();
  if (!night) return null;
  return (
    <div className={`night-wrap ${night.last ? 'last' : ''} ${night.paused ? 'paused' : ''}`}>
      <div className="nw-row">
        {!touch && <NightClock night={night} />}
        <div className="night-bar single" title={t('nightLeftTitle')}>
          <div className={`nb-seg ${night.frac >= 1 ? 'done' : 'cur'}`}>
            <i style={{ width: `${night.frac * 100}%` }} />
          </div>
          <img className="nb-moon" src={asset(`${skin.art.nightMarker}.webp`)} alt="" style={{ left: `${night.frac * 100}%` }} />
        </div>
      </div>
      <div className={`progress ${open ? 'open' : ''}`} title={t('progress')}>
        <div className="fill" style={{ width: `${pct}%` }} />
        <span>
          {open ? t('handoffOpen') : `${t('progress')} · ${progress}/${target} (${pct}%)`}
        </span>
      </div>
    </div>
  );
}

/** After being arrested: tell the player (once) that they are now a spectator. */
function GhostNotice({ dead, crew }: { dead: boolean; crew: boolean }) {
  const skin = useSkin();
  const phase = useStore((s) => s.room?.phase);
  const cinematic = useStore((s) => s.cinematic);
  const t = useT();
  const [state, setState] = useState<'none' | 'open' | 'seen' | 'hidden'>('none');
  useEffect(() => {
    if (!dead) setState('none');
    else if (state === 'none' && phase === 'explore' && !cinematic) setState('open');
  }, [dead, phase, cinematic, state]);
  if (!dead || phase !== 'explore') return null;
  if (state === 'hidden') return null;
  if (state !== 'open')
    return (
      <div className="ghost-strip">
        <span>{crew ? t('ghostStrip') : t('ghostStripKiller')}</span>
        <button className="ghost-strip-x" onClick={() => setState('hidden')} aria-label={t('close')} title={t('close')}>
          ✕
        </button>
      </div>
    );
  return (
    <div className="modal-backdrop ghost-backdrop">
      <div className="ghost-notice">
        <img src={asset(`${skin.art.ghostIcon}.webp`)} width={120} height={120} alt="" />
        <div className="ghost-body">
          <h2>{crew ? t('ghostTitle') : t('ghostKillerTitle')}</h2>
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
            {t('ghostGo')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Veteran: pick one driver (once per game), then read their last task activities. */
export function InspectPanel() {
  const open = useStore((s) => s.inspectOpen);
  const result = useStore((s) => s.inspect);
  const me = useStore((s) => s.me);
  const room = useStore((s) => s.room);
  const sessionId = useStore((s) => s.sessionId);
  const set = useStore((s) => s.set);
  const t = useT();
  if (!open || !room) return null;
  const close = () => set({ inspectOpen: false });
  const pickable = room.players.filter((p) => p.alive && p.id !== sessionId);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal inspect-panel" onClick={(e) => e.stopPropagation()}>
        <CloseButton className="modal-x" onClick={close} label={t('close')} />
        {result ? (
          <>
            <h2>
              {t('inspectOf')} <b style={{ color: colorHex(result.color) }}>{result.target}</b>
            </h2>
            {result.entries.length === 0 ? (
              <p className="inspect-empty">{t('inspectNone')}</p>
            ) : (
              <ul className="inspect-list">
                {result.entries.map((e, i) => (
                  <li key={i} className={e.status}>
                    <i className="tick">{e.status === 'done' ? '✔' : '✖'}</i>
                    <span>
                      <b>{e.title}</b>
                      <small>
                        📍 {e.area} · {t('agoSec').replace('{n}', String(e.agoSec))} · {e.status === 'done' ? t('statusDone') : t('statusFailed')}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="inspect-note">{t('inspectNote')}</p>
          </>
        ) : me?.inspectLeft ? (
          <>
            <h2>{t('inspectPick')}</h2>
            <div className="inspect-pick">
              {pickable.map((p) => (
                <button key={p.id} className="btn ghost" {...tapProps(() => send('skill:inspect', { target: p.id }))}>
                  <i className="dot" style={{ background: colorHex(p.color) }} /> {p.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p>{t('inspectUsed')}</p>
        )}
      </div>
    </div>
  );
}

/** Undercover: press and hold next to a driver; the server times the hold and cancels it if they get away. */
function ArrestButton({ ready, cdLeft, readyAt, label, icon }: { ready: boolean; cdLeft: number | null; readyAt: number; label: string; icon: string }) {
  const holding = useStore((s) => s.arrestHold?.youAre === 'actor');
  useEffect(() => () => arrest(false), []);
  return (
    <button
      className={`round-btn kill slot-main ${ready || holding ? 'ready' : 'idle'} ${cdLeft ? 'cooling' : ''} ${holding ? 'holding' : ''}`}
      style={{ '--hold': `${GAME.arrestHoldSec}s` } as React.CSSProperties}
      disabled={!ready && !holding}
      onPointerDown={(e) => ((e.target as HTMLElement).setPointerCapture?.(e.pointerId), arrest(true))}
      onPointerUp={() => arrest(false)}
      onPointerCancel={() => arrest(false)}
      onContextMenu={(e) => e.preventDefault()}
      title={`${label} (K)`}
      aria-label={label}
    >
      <img src={asset(`${icon}.webp`)} alt="" draggable={false} />
      {holding && <i className="hold-fill" aria-hidden />}
      {cdLeft ? <CooldownRing readyAt={readyAt} /> : null}
      {cdLeft ? <span className="cd"><Digits text={cdLeft} /></span> : null}
      <kbd>K</kbd>
      <em>{label}</em>
    </button>
  );
}

export function Hud() {
  const skin = useSkin();
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.me);
  const nearby = useStore((s) => s.nearby);
  const arrestTarget = useStore((s) => s.arrestTarget);
  const area = useStore((s) => s.area) as AreaId | '';
  const set = useStore((s) => s.set);
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
  const killLabel = skin.killButton ? (en ? skin.killButton.label.en : skin.killButton.label.vi) : t('kill');
  const sessionId = useStore((s) => s.sessionId);
  const left = useCountdown(room.phaseEndsAt);
  const cdLeft = useCountdown(me?.arrestReadyAt ?? 0);
  const pct = Math.min(100, Math.round((room.progress / Math.max(1, room.progressTarget)) * 100));
  const inGame = room.phase !== 'lobby';
  const mine = room.players.find((p) => p.id === sessionId);
  const alive = mine?.alive !== false;
  const killer = me?.faction === 'killer';
  const veteran = me?.role === 'veteran_driver';
  const pos = useStore((s) => s.pos);
  const arrestReady = killer && arrestTarget && !cdLeft;
  const canReport = nearby?.kind === 'report';
  const carrying = room.packageState === 'carried' && room.packageCarrier === sessionId;
  const canPick = nearby?.kind === 'package';
  // phones: a big "do task" button pops in only while standing at an open station
  const taskHere = nearby?.kind === 'task' && !nearby.done ? nearby : null;
  const [mapOpen, setMapOpen] = useState(false);
  const taskOpen = useStore((s) => !!s.task);
  // phones start with the prep list folded so the left thumb (joystick) has room
  const [tasksOpen, setTasksOpen] = useState(() => !isTouchDevice());
  const exploring = !!me && inGame && room.phase === 'explore';
  useEffect(() => {
    if (!exploring) return;
    const h = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (e.repeat || (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'))) return;
      if (uiBlocksMovement()) return;
      if (e.code === 'KeyM') setMapOpen((v) => !v);
      else if (e.code === 'KeyT') setTasksOpen((v) => !v);
      else if (e.code === 'KeyU' && veteran) set({ inspectOpen: true });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [exploring, veteran, set]);
  useEffect(() => {
    if (!exploring) setMapOpen(false);
  }, [exploring]);

  /** prep stations with turns left, and the handoff point once it opens */
  const rows = [...PREP_TASK_IDS, 'handoff_package' as const].map((id: TaskId) => {
    const st = skin.stations.find((x) => x.id === id)!;
    const c = room.stations[id];
    const handoff = id === 'handoff_package';
    const done = handoff ? room.packageState === 'delivered' : !!c && c.done >= c.need;
    const locked = handoff && !room.handoffOpen;
    return { id, st, need: c?.need ?? 1, got: c?.done ?? 0, done, locked, handoff };
  });
  const pendingAreas = new Set<AreaId>(rows.filter((r) => !r.done && !r.locked).map((r) => r.st.area));

  const touch = isTouchDevice();
  const taskItems = (
    <ul>
      {rows.map((r) => {
        const here = r.st.area === area && !r.done && !r.locked;
        return (
          <li key={r.id} className={`${r.done ? 'done' : ''} ${here ? 'here' : ''} ${r.locked ? 'locked' : ''}`}>
            <i className="tick">{r.done ? '✔' : r.locked ? '🔒' : ''}</i>
            <span>
              {en ? r.st.titleEn : r.st.title}
              {!r.handoff && r.need > 1 && (
                <b className="task-turns">
                  {' '}
                  {Math.min(r.got, r.need)}/{r.need}
                </b>
              )}
              <small className="task-where">📍 {en ? skin.areas[r.st.area].nameEn : skin.areas[r.st.area].name}</small>
            </span>
          </li>
        );
      })}
    </ul>
  );

  const taskChip = me && (
    <button className="task-chip" onClick={() => setTasksOpen(true)} title={touch ? t('myTasks') : `${t('myTasks')} (T)`}>
      <img src={asset('maps/common/ui/notebook.webp')} alt="" draggable={false} />
      <b>
        {room.progress}/{room.progressTarget}
      </b>
      {!touch && <kbd className="task-chip-key">T</kbd>}
    </button>
  );

  const meter = (
    <div className="task-meter">
      <div style={{ width: `${pct}%` }} />
    </div>
  );

  return (
    <>
      {inGame && (
        <div className="hud-notices">
          <HoldNotice />
          {room.phase === 'explore' && <CarryNotice />}
        </div>
      )}
      {/* top centre: the (small) location plate on top, countdown + preparation under it */}
      <div className="hud-top">
        {area && (
          <div className="area-name" key={area}>
            <span>{skin.areas[area].name}</span>
          </div>
        )}
        {inGame && room.phase !== 'ended' && <NightBar pct={pct} progress={room.progress} target={room.progressTarget} open={room.handoffOpen} />}
        {inGame && left != null && (
          <div className="hud-status">
            <span className="timer">
              <Icon name="timer" size={20} /> <Digits text={fmt(left)} />
            </span>
          </div>
        )}
      </div>
      {/* the end screen has its own leave button; the cog would sit on top of its corner */}
      {/* phones: hidden over the meeting, where the corner cog covered the vote timer */}
      {room.phase !== 'ended' && !(touch && (room.phase === 'meeting' || room.phase === 'reveal')) && (
        <>
          <VoiceControls />
          <GameSettings />
        </>
      )}
      {me && inGame && <GhostNotice dead={!alive} crew={me.faction === 'crew'} />}
      <InspectPanel />

      {me && inGame && (
        <button className={`role-card ${me.faction}`} onClick={() => set({ introOpen: true, introQuick: true })} title={t('roleGoal')}>
          <RoleBadge role={me.role} size={48} />
          <div>
            <strong>{skin.roles[me.role].name}</strong>
            <span className="faction">{killer ? t('killerFaction') : t('crewFaction')}</span>
            <span className="ability">{!alive ? t('ghost') : skin.roles[me.role].short}</span>
          </div>
        </button>
      )}

      {mapOpen && <MapView current={area} pos={pos} onClose={() => setMapOpen(false)} />}

      {me && inGame && room.phase === 'explore' && (
        <div className="hud-left">
          <button className="minimap-btn" onClick={() => setMapOpen(true)} title={`${t('map')} (M)`}>
            <MiniMap current={area} pending={pendingAreas} pos={pos} />
          </button>
          {/* desktop when folded: just the notebook chip, so a closed list never blocks the view (phones: top right, below) */}
          {touch ? null : !tasksOpen ? (
            taskChip
          ) : (
            <div className="task-list open">
              <button className="task-head" onClick={() => setTasksOpen(false)} aria-expanded title={`${t('hide')} (T)`}>
                <span className="task-head-title">{t('myTasks')}</span>
                <b className="task-count">
                  {room.progress}/{room.progressTarget}
                </b>
                <span className="task-toggle" aria-hidden>
                  <kbd>T</kbd>
                  <i className="chev" />
                </span>
              </button>
              {meter}
              {killer && <p className="task-note">{t('fakeTasks')}</p>}
              {taskItems}
            </div>
          )}
        </div>
      )}
      {/* touch: right column under the role card — clock, then the prep chip */}
      {inGame && touch && room.phase !== 'ended' && (
        <div className="task-chip-dock">
          <NightClockDock />
          {me && room.phase === 'explore' && taskChip}
        </div>
      )}
      {me && inGame && room.phase === 'explore' && touch && tasksOpen && !taskOpen && (
        <div className="modal-backdrop task-pop-backdrop" onClick={() => setTasksOpen(false)}>
          <div className="task-list task-pop open" onClick={(e) => e.stopPropagation()}>
            <div className="task-pop-head">
              <span className="task-head-title">{t('myTasks')}</span>
              <b className="task-count">
                {room.progress}/{room.progressTarget}
              </b>
              <CloseButton className="task-pop-x" onClick={() => setTasksOpen(false)} label={t('close')} />
            </div>
            {meter}
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

      {/* veteran: one inspection per game, in explore and in meetings */}
      {veteran && alive && (room.phase === 'explore' || room.phase === 'meeting') && (
        <button
          className={`round-btn inspect ${me?.inspectLeft ? 'ready' : 'idle'}`}
          {...tapProps(() => set({ inspectOpen: true }))}
          title={`${t('inspect')} (U)`}
          aria-label={t('inspect')}
        >
          <span className="round-glyph">🔎</span>
          <kbd>U</kbd>
          <em>{me?.inspectLeft ? t('inspect') : t('used')}</em>
        </button>
      )}

      {room.phase === 'explore' && alive && (
        <div className="action-bar cluster">
          {killer && (
            <ArrestButton
              ready={!!arrestReady}
              cdLeft={cdLeft}
              readyAt={me?.arrestReadyAt ?? 0}
              label={killLabel}
              icon={skin.killButton?.icon ?? 'maps/common/ui/btn-kill'}
            />
          )}
          <button
            className={`round-btn report slot-top ${canReport ? 'ready' : 'idle'}`}
            disabled={!canReport}
            {...tapProps(() => send('report', {}))}
            title={`${t('report')} (L)`}
            aria-label={t('report')}
          >
            <img src={asset('maps/common/ui/btn-report.webp')} alt="" draggable={false} />
            <kbd>L</kbd>
            <em>{t('report')}</em>
          </button>
          {/* the package: pick it up next to it, put it down anywhere (G) */}
          {(carrying || canPick) && (
            <button
              className={`round-btn package slot-left ready`}
              {...tapProps(() => !uiBlocksMovement() && send(carrying ? 'package:drop' : 'package:pick', {}))}
              title={`${carrying ? t('dropPkg') : t('pickUp')} (G)`}
              aria-label={carrying ? t('dropPkg') : t('pickUp')}
            >
              <span className="round-glyph">📦</span>
              <kbd>G</kbd>
              <em>{carrying ? t('dropPkg') : t('pickUp')}</em>
            </button>
          )}
          {/* drivers: the main button, lit at an open station; the undercover: a small one that only pops in there */}
          {(!killer || taskHere) && (
            <button
              key={killer ? taskHere?.id : 'task'}
              className={`round-btn task ${killer ? 'slot-diag' : 'slot-main'} ${taskHere ? 'ready' : 'idle'}`}
              disabled={!taskHere}
              {...tapProps(() => taskHere && !uiBlocksMovement() && send('task:open', { taskId: taskHere.id }))}
              title={taskHere ? `${taskHere.title} (J)` : t('doTask')}
              aria-label={taskHere ? `${t('doTask')}: ${taskHere.title}` : t('doTask')}
            >
              <img src={asset('maps/common/ui/btn-task.webp')} alt="" draggable={false} />
              <kbd>J</kbd>
              <em>{t('doTask')}</em>
            </button>
          )}
        </div>
      )}

      {/* tasks get an in-world "tap" badge over the station (GameScene) — the lit report button covers abandoned bikes; the horn gets its own art button */}
      {nearby?.kind === 'emergency' && room.phase === 'explore' && (
        <button
          className={`round-btn bell ${nearby.used ? 'idle' : 'ready'}`}
          disabled={nearby.used}
          {...tapProps(() => send('emergency', {}))}
          title={`${nearby.title} (B)`}
          aria-label={nearby.title}
        >
          <img src={asset('maps/common/ui/btn-bell.webp')} alt="" draggable={false} />
          <kbd>B</kbd>
          <em>{nearby.used ? t('used') : nearby.title}</em>
        </button>
      )}
    </>
  );
}
