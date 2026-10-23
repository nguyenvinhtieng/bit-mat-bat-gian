import { ActionArt } from './ActionArt';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { sfx } from './minigames/common/kit';
import { AREA_RECTS, GAME, LAYOUT_H, LAYOUT_W, TILE, type AreaId, type TaskId } from '@hidden-truth/shared';

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
import { CloseButton, Digits, Icon, RoleBadge, asset, fmt, tapProps, useCountdown, useEscape, usePackageSpot, useSkin } from './common';
import { MapView } from './MapView';
import { GameSettings } from './GameSetting';
import { VoiceControls } from './VoiceControls';
import { isTouchDevice } from './Joystick';
import { SayBox, SayButton } from './SayBox';

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

/** One countdown before daybreak (paused during meetings): only the time left is shown. */
function useClock() {
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
  const left = Math.ceil((total - elapsed) / 1000);
  return { left, last: left <= 60, urgent: left <= 30 && !room.nightPausedAt, paused: !!room.nightPausedAt };
}

type Prep = { pct: number; progress: number; target: number; open: boolean };

/** Dispatch clock: time left and the crew's shared preparation. */
function NightClock({ night, prep }: { night: NonNullable<ReturnType<typeof useClock>>; prep: Prep }) {
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
  return (
    <div className="night-clock" title={t('nightTitle')}>
      <svg className="nc-icon" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        {night.paused ? <path d="M10 9v6m4-6v6" /> : <path d="M12 7v5l3 2" />}
      </svg>
      {night.paused ? (
        <span className="nc-left">{t('nightPaused')}</span>
      ) : (
        <span className="nc-left" title={t('nightLeftTitle')}>
          {t('nightLeft')} <b className="nc-time"><Digits text={fmt(night.left)} /></b>
        </span>
      )}
      <span className={`nc-prep ${prep.open ? 'open' : ''}`} title={t('progress')}>
        {prep.open ? (en ? 'Handoff open' : 'Mở bàn giao') : <Digits text={`${prep.progress}/${prep.target} · ${prep.pct}%`} />}
      </span>
    </div>
  );
}

/** Top-right corner (desktop and touch): one pill with time left and preparation progress. */
function NightBar(prep: Prep) {
  const night = useClock();
  if (!night) return null;
  return (
    <div className={`night-wrap ${night.last ? 'last' : ''} ${night.urgent ? 'urgent' : ''} ${night.paused ? 'paused' : ''}`}>
      <NightClock night={night} prep={prep} />
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
      <div className={`ghost-notice ${crew ? 'crew' : 'out'}`}>
        <div className="ghost-seal" aria-hidden>
          {crew ? (
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              <path d="M15 3a6 6 0 0 1 6 6M15 7a2 2 0 0 1 2 2" />
            </svg>
          ) : (
            <img src={asset(`${skin.art.ghostIcon}.webp`)} width={40} height={40} alt="" />
          )}
        </div>
        <div className="ghost-body">
          <small className="ghost-kicker">{t('ghostKicker')}</small>
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
  // inspection is an explore-phase action: never over the meeting
  if (!open || !room || room.phase !== 'explore') return null;
  const close = () => set({ inspectOpen: false });
  const pickable = room.players.filter((p) => p.alive && p.id !== sessionId);
  const done = result?.entries.filter((e) => e.status === 'done') ?? [];
  const title = result ? t('inspectOf') : t('inspect');
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal inspect-panel" onClick={(e) => e.stopPropagation()}>
        <header className="inspect-head">
          <span className="inspect-icon" aria-hidden>🔍</span>
          <div className="inspect-title">
            <small>{title}</small>
            {result ? (
              <h3>
                <i className="dot" style={{ background: colorHex(result.color) }} />
                {result.target}
              </h3>
            ) : (
              <h3>{me?.inspectLeft ? t('inspectPick') : t('inspectUsed')}</h3>
            )}
          </div>
          <CloseButton onClick={close} label={t('close')} />
        </header>
        <div className="inspect-body">
          {result ? (
            done.length === 0 ? (
              <p className="inspect-empty">{t('inspectNone')}</p>
            ) : (
              <ol className="inspect-list">
                {done.map((e, i) => (
                  <li key={i}>
                    <i className="tick">✔</i>
                    <div className="inspect-entry">
                      <b>{e.title}</b>
                      <small>
                        <span>📍 {e.area}</span>
                        <span>{t('agoSec').replace('{n}', String(e.agoSec))}</span>
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )
          ) : me?.inspectLeft ? (
            <div className="inspect-pick">
              {pickable.map((p) => (
                <button key={p.id} className="inspect-pick-btn" style={{ '--pc': colorHex(p.color) } as CSSProperties} onClick={() => send('skill:inspect', { target: p.id })}>
                  <i className="inspect-avatar">{p.name.slice(0, 1).toUpperCase()}</i>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          ) : null}
          {(result || me?.inspectLeft) && <p className="inspect-note">ⓘ {t('inspectNote')}</p>}
        </div>
      </div>
    </div>
  );
}

/** One click requests an immediate arrest. */
function ArrestButton({ ready, cdLeft, readyAt, label }: { ready: boolean; cdLeft: number | null; readyAt: number; label: string }) {
  return (
    <button
      className={`round-btn kill slot-main ${ready ? 'ready' : 'idle'} ${cdLeft ? 'cooling' : ''}`}
      disabled={!ready}
      onClick={() => arrest(true)}
      onContextMenu={(e) => e.preventDefault()}
      title={`${label} (K)`}
      aria-label={label}
    >
      <ActionArt name="arrest" />
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
  // Keep the map clear until the player opens their task handset.
  const [tasksOpen, setTasksOpen] = useState(false);
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

  /** my own prep list (the cop's is cover), then the handoff point once it opens — arrested runners never hand off */
  const mineList: { id: TaskId; done: boolean }[] = [...(me?.tasks ?? [])];
  if (alive) mineList.push({ id: 'handoff_package', done: room.packageState === 'delivered' });
  const rows = mineList.map(({ id, done }, i) => {
    const st = skin.stations.find((x) => x.id === id)!;
    const handoff = id === 'handoff_package';
    const locked = handoff && !room.handoffOpen;
    return { key: `${id}-${i}`, id, st, done, locked, handoff };
  });
  const myDone = me?.tasks?.filter((j) => j.done).length ?? 0;
  const myTotal = me?.tasks?.length ?? 0;
  const pendingAreas = new Set<AreaId>(rows.filter((r) => !r.done && !r.locked).map((r) => r.st.area));

  const touch = isTouchDevice();
  useEscape(() => setTasksOpen(false), exploring && tasksOpen && !taskOpen);
  const taskItems = (
    <ul>
      {rows.map((r, index) => {
        const here = r.st.area === area && !r.done && !r.locked;
        return (
          <li key={r.key} className={`${r.done ? 'done' : ''} ${here ? 'here' : ''} ${r.locked ? 'locked' : ''}`}>
            <i className="tick" aria-hidden>{r.done ? '✓' : r.locked ? '−' : String(index + 1).padStart(2, '0')}</i>
            <span className="dispatch-order">
              <strong>{r.handoff ? (en ? `Pick up the order and deliver to ${skin.areas[r.st.area].nameEn}` : `Nhặt đơn hàng và giao tới ${skin.areas[r.st.area].name}`) : (en ? r.st.titleEn : r.st.title)}</strong>
              <small className="task-where">{en ? skin.areas[r.st.area].nameEn : skin.areas[r.st.area].name}</small>
              {r.handoff && !r.done && <small className="dispatch-hint">{en ? 'At the drop-off, enter the receiving code to finish.' : 'Tới điểm hẹn, nhập mã nhận để hoàn tất.'}</small>}
              {(r.done || r.locked || here) && <small className="dispatch-state">{r.done ? (en ? 'Completed' : 'Hoàn tất') : r.locked ? (en ? 'Locked · finish preparation' : 'Đang khóa · hoàn tất chuẩn bị') : (en ? 'You are here' : 'Bạn đang ở đây')}</small>}
              {!r.handoff && !r.done && (
                <button
                  type="button"
                  className="dispatch-map-hint"
                  onClick={() => {
                    setTasksOpen(false);
                    setMapOpen(true);
                  }}
                >
                  {en ? 'Open map for directions' : 'Xem bản đồ để tìm đường'}
                  {!touch && <span aria-hidden> · M</span>}
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  const taskChip = me && (
    <button className="task-chip crab-task-chip" onClick={() => setTasksOpen(true)} aria-label={`${t('myTasks')}: ${myDone}/${myTotal}`} aria-expanded={tasksOpen} title={touch ? t('myTasks') : `${t('myTasks')} (T)`}>
      <img src={asset('maps/common/ui/saigon/crab-dispatch.svg')} alt="" draggable={false} />
      <span className="dispatch-chip-label">CRAB<small>{en ? 'Tasks' : 'Nhiệm vụ'}</small></span>
      <b>
        {myDone}/{myTotal}
      </b>
      {!touch && <kbd className="task-chip-key">T</kbd>}
    </button>
  );

  const dispatchBrand = (
    <div className="dispatch-brand" aria-hidden>
      <img src={asset('maps/common/ui/saigon/crab-dispatch.svg')} alt="" draggable={false} />
      <span>CRAB<small>{en ? 'NIGHT DISPATCH' : 'ĐIỀU PHỐI CA ĐÊM'}</small></span>
      <i className="dispatch-signal"><i /><i /><i /></i>
    </div>
  );

  const meter = (
    <div className="task-meter" role="progressbar" aria-label={t('myTasks')} aria-valuemin={0} aria-valuemax={Math.max(1, myTotal)} aria-valuenow={myDone}>
      <div style={{ width: `${Math.round((myDone / Math.max(1, myTotal)) * 100)}%` }} />
    </div>
  );

  /** Veteran inspection stays next to the main task action. */
  const inspectBtn = (slot: string) => (
    <button
      className={`round-btn inspect ${slot} ${me?.inspectLeft ? 'ready' : 'idle'}`}
      {...tapProps(() => set({ inspectOpen: true }))}
      title={`${t('inspect')} (U)`}
      aria-label={t('inspect')}
    >
      <ActionArt name="inspect" />
      <kbd>U</kbd>
      <em>{me?.inspectLeft ? t('inspect') : t('used')}</em>
    </button>
  );

  return (
    <>
      {inGame && (
        <div className="hud-notices">
          {room.phase === 'explore' && <CarryNotice />}
        </div>
      )}
      {/* top centre: the (small) location plate */}
      <div className="hud-top">
        {area && (
          <div className="area-name" data-map={skin.slug} key={area}>
            <span>{skin.areas[area].name}</span>
          </div>
        )}
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
            <b className="role-tag">{en ? skin.roles[me.role].tag.en : skin.roles[me.role].tag.vi}</b>
            <span className="faction">{killer ? t('killerFaction') : t('crewFaction')}</span>
            <span className="ability">{!alive ? t('ghost') : skin.roles[me.role].short}</span>
          </div>
        </button>
      )}

      {mapOpen && <MapView current={area} pos={pos} mine={rows.filter((r) => !r.locked)} onClose={() => setMapOpen(false)} />}

      {me && inGame && room.phase === 'explore' && (
        <div className="hud-left">
          <button className="minimap-btn" onClick={() => setMapOpen(true)} title={`${t('map')} (M)`}>
            <MiniMap current={area} pending={pendingAreas} pos={pos} />
          </button>
        </div>
      )}
      {/* Shared desktop/mobile dock: countdown and task handset below the settings. */}
      {inGame && room.phase !== 'ended' && (
        <div className="hud-right-dock">
          <NightBar pct={pct} progress={room.progress} target={room.progressTarget} open={room.handoffOpen} />
          {me && room.phase === 'explore' && taskChip}
        </div>
      )}
      {me && inGame && room.phase === 'explore' && tasksOpen && !taskOpen && (
        <div className="modal-backdrop task-pop-backdrop" onClick={() => setTasksOpen(false)}>
          <div className="task-list crab-dispatch task-pop open" role="dialog" aria-modal="true" aria-label={t('myTasks')} onClick={(e) => e.stopPropagation()}>
            <div className="dispatch-top">
              {dispatchBrand}
              <div className="task-pop-head">
                <b className="task-count">
                  {myDone}/{myTotal}
                </b>
                <CloseButton className="task-pop-x" onClick={() => setTasksOpen(false)} label={t('close')} />
              </div>
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

      {room.phase === 'explore' && alive && (
        <div className={`action-bar cluster role-${killer ? 'undercover' : veteran ? 'veteran' : 'driver'}`} role="group" aria-label={t('controls')}>
          <SayButton />
          {nearby?.kind === 'emergency' && (
            <button
              className={`round-btn bell slot-bell ${nearby.used ? 'idle' : 'ready'}`}
              disabled={nearby.used}
              {...tapProps(() => send('emergency', {}))}
              title={`${nearby.title} (B)`}
              aria-label={nearby.title}
            >
              <ActionArt name="bell" />
              <kbd>B</kbd>
              <em>{nearby.used ? t('used') : nearby.title}</em>
            </button>
          )}
          {killer && (
            <ArrestButton
              ready={!!arrestReady}
              cdLeft={cdLeft}
              readyAt={me?.arrestReadyAt ?? 0}
              label={killLabel}
            />
          )}
          <button
            className={`round-btn report slot-top ${canReport ? 'ready' : 'idle'}`}
            disabled={!canReport}
            {...tapProps(() => send('report', {}))}
            title={`${t('report')} (L)`}
            aria-label={t('report')}
          >
            <ActionArt name="report" />
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
              <ActionArt name="package" />
              <kbd>G</kbd>
              <em>{carrying ? t('dropPkg') : t('pickUp')}</em>
            </button>
          )}
          {veteran && inspectBtn('slot-inspect')}
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
              <ActionArt name="task" />
              <kbd>J</kbd>
              <em>{t('doTask')}</em>
            </button>
          )}
        </div>
      )}
      {room.phase === 'explore' && alive && <SayBox />}


    </>
  );
}
