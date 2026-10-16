import { useEffect, useRef, useState } from 'react';
import { sfx } from './minigames/common/kit';
import { AREA_RECTS, GAME, SABOTAGE, TILE, canhMs as canhMsFor, LAYOUT_H, LAYOUT_W, type AreaId, type SabotageKind } from '@hidden-truth/shared';

function MiniMap({ current, pending, pos, big, onClick }: { current: AreaId | ''; pending: Set<AreaId>; pos: { x: number; y: number } | null; big?: boolean; onClick?: () => void }) {
  const skin = useSkin();
  const ward = useWardSpot();
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
      {ward && (
        <g className="mm-ward">
          <circle cx={ward.x / TILE} cy={ward.y / TILE} r={2.6} className="mm-ward-pulse" />
          <circle cx={ward.x / TILE} cy={ward.y / TILE} r={1.2} className="mm-ward-dot" />
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
import { fix, send } from '../net';
import { KILLER_NAME_COLOR, uiBlocksMovement, useStore } from '../store';
import { useLang, useT } from '../i18n';
import { CloseButton, Digits, Icon, RoleBadge, asset, fmt, tapProps, useCountdown, useSkin, useWardSpot } from './common';
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

/** Sabotage icon from the map skin, or a common glyph. */
function SabIcon({ kind, size = 28 }: { kind: SabotageKind; size?: number }) {
  const skin = useSkin();
  const icon = skin.sabotage[kind].icon;
  return icon ? <img src={asset(`${icon}.webp`)} alt="" width={size} height={size} draggable={false} /> : <span className="sab-glyph">{kind === 'blind' ? '💥' : '⛩'}</span>;
}

/** Alert while a sabotage runs: a short burst for `blind`, a countdown + where to go for `ward`. */
function SabotageAlert() {
  const skin = useSkin();
  const room = useStore((s) => s.room)!;
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
  const left = useCountdown(room.sabotage ? room.sabotageEndsAt : 0);
  const kind = room.sabotage;
  useEffect(() => {
    if (kind === 'blind') (sfx.drum(), setTimeout(() => sfx.senh(), 90), setTimeout(() => sfx.senh(), 260));
    else if (kind === 'ward') sfx.bad();
  }, [kind, room.sabotageEndsAt]);
  useEffect(() => {
    if (kind === 'ward' && left != null && left > 0 && left <= 10) sfx.scrape();
  }, [kind, left]);
  if (!kind || room.phase !== 'explore') return null;
  const sk = skin.sabotage[kind];
  const area = room.sabotageArea ? skin.areas[room.sabotageArea as AreaId] : null;
  const text = (en ? sk.alert.en : sk.alert.vi).replace('{area}', area ? (en ? area.nameEn : area.name) : '');
  return (
    <div className={`sab-alert ${kind} ${kind === 'ward' && (left ?? 99) <= 10 ? 'urgent' : ''}`} role="alert" key={room.sabotageEndsAt}>
      <SabIcon kind={kind} size={36} />
      <div>
        <b>{en ? sk.name.en : sk.name.vi}</b>
        <span>{text}</span>
      </div>
      {kind === 'ward' && left != null && <Digits text={fmt(left)} />}
    </div>
  );
}

/** Killer button: opens a two-item menu (blind / ward). Shares one cooldown; one sabotage at a time. */
function SabotageButton({ slot = '' }: { slot?: string }) {
  const skin = useSkin();
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.me)!;
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
  const [open, setOpen] = useState(false);
  const cd = useCountdown(me.sabotageReadyAt ?? 0);
  const busy = !!room.sabotage;
  const ready = !cd && !busy;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (e.repeat || (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'))) return;
      if (useStore.getState().task) return;
      if (e.code === 'KeyI' || e.code === 'KeyQ') setOpen((v) => !v);
      else if (open && (e.code === 'Digit1' || e.code === 'Digit2')) go(e.code === 'Digit1' ? 'blind' : 'ward');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  useEffect(() => {
    if (!ready) setOpen(false);
  }, [ready]);
  const go = (kind: SabotageKind) => {
    setOpen(false);
    send('sabotage', { kind });
  };
  const label = en ? 'Sabotage' : 'Phá';
  return (
    <div className={`sab-wrap ${slot}`}>
      {open && ready && (
        <div className="sab-menu" role="menu">
          {(['blind', 'ward'] as const).map((k, i) => (
            <button key={k} role="menuitem" {...tapProps(() => go(k))}>
              <SabIcon kind={k} />
              <span>
                <b>{en ? skin.sabotage[k].name.en : skin.sabotage[k].name.vi}</b>
                <small>{k === 'blind' ? (en ? `Blinds the crew ${SABOTAGE.blindSec}s` : `Làm mù phe dân ${SABOTAGE.blindSec}s`) : en ? `Fix within ${SABOTAGE.wardSec}s or you win` : `Không sửa kịp ${SABOTAGE.wardSec}s là thắng`}</small>
              </span>
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </div>
      )}
      <button
        className={`round-btn sab ${ready ? 'ready' : 'idle'} ${cd ? 'cooling' : ''}`}
        disabled={!ready}
        {...tapProps(() => setOpen((v) => !v))}
        title={`${label} (I)`}
        aria-label={label}
        aria-expanded={open}
      >
        <SabIcon kind="ward" size={44} />
        {cd ? <CooldownRing readyAt={me.sabotageReadyAt ?? 0} /> : null}
        {cd ? <span className="cd"><Digits text={cd} /></span> : null}
        <kbd>I</kbd>
        <em>{label}</em>
      </button>
    </div>
  );
}

/** Hold-to-fix pill at the ward spot (pointer or J/Space); the server times the hold. */
function FixButton({ title }: { title: string }) {
  const skin = useSkin();
  const fixing = useStore((s) => s.fixing);
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
  useEffect(() => () => fix(false), []);
  return (
    <button
      className={`interact fix ${fixing ? 'holding' : ''}`}
      style={{ '--hold': `${SABOTAGE.fixHoldSec}s` } as React.CSSProperties}
      onPointerDown={(e) => ((e.target as HTMLElement).setPointerCapture?.(e.pointerId), fix(true))}
      onPointerUp={() => fix(false)}
      onPointerCancel={() => fix(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <i className="fix-fill" aria-hidden />
      <kbd>J</kbd>
      <SabIcon kind="ward" size={22} />
      {en ? skin.sabotage.ward.fix.en : title}
      <small>{en ? '(hold)' : '(giữ)'}</small>
    </button>
  );
}

/** Night-watch drum banner: shown (with the drum) each time a new canh begins. */
function CanhBanner() {
    const skin = useSkin();
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
      <img src={asset(`${skin.art.clockIcon}.webp`)} alt="" />
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


/** Night clock: 5 canh that run on time (paused during meetings). Elapsed is derived from synced timestamps. */
function useNight() {
    const skin = useSkin();
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
  // in-game clock from the map skin (Huế: canh một starts 19:00, each canh is 2 hours)
  const { startMin, segmentMin } = skin.story.clock;
  const mins = startMin + Math.floor((elapsed / canhMs) * segmentMin);
  const h = Math.floor(mins / 60) % 24;
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
    const skin = useSkin();
const night = useNight();
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
  if (!night) return null;
  const last = night.canh === GAME.canhCount;
  return (
    <div className={`night-wrap ${last ? 'last' : ''} ${night.paused ? 'paused' : ''}`}>
      <div className="nw-row">
      <div className="night-clock" title={t('nightTitle')}>
        <img src={asset(`${skin.art.clockIcon}.webp`)} width={26} height={26} alt="" />
        <span className="nc-canh">
          {t('canh')} {en ? skin.story.segments[night.canh - 1].en : skin.story.segments[night.canh - 1].vi}
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
              <span>{en ? skin.story.segments[i].en : skin.story.segments[i].vi}</span>
            </div>
          );
        })}
        <img className="nb-moon" src={asset(`${skin.art.nightMarker}.webp`)} alt="" style={{ left: `${night.frac * 100}%` }} />
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
    const skin = useSkin();
const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.me);
  const nearby = useStore((s) => s.nearby);
  const killTarget = useStore((s) => s.killTarget);
  const area = useStore((s) => s.area) as AreaId | '';
  const set = useStore((s) => s.set);
  const t = useT();
  const en = useLang((s) => s.lang) === 'en';
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
  // phones: a big "do task" button pops in only while standing at one of my unfinished stations
  const taskHere = nearby?.kind === 'task' && !nearby.done ? nearby : null;
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
      .map((id) => skin.stations.find((x) => x.id === id)!.area),
  );

  const touch = isTouchDevice();
  const taskItems = me && (
          <ul>
            {me.tasks.map((id) => {
              const st = skin.stations.find((x) => x.id === id)!;
              const done = me.completedTasks.includes(id);
              const here = st.area === area && !done;
              return (
                <li key={id} className={`${done ? 'done' : ''} ${here ? 'here' : ''}`}>
                  <i className="tick">{done ? '✔' : ''}</i>
                  <span>
                    {en ? st.titleEn : st.title}
                    <small className="task-where">📍 {en ? skin.areas[st.area].nameEn : skin.areas[st.area].name}</small>
                  </span>
                </li>
              );
            })}
          </ul>
  );

  const taskChip = me && (
    <button className="task-chip" onClick={() => setTasksOpen(true)} title={touch ? t('myTasks') : `${t('myTasks')} (T)`}>
      <img src={asset('common/ui/notebook.webp')} alt="" draggable={false} />
      <b>
        {me.completedTasks.length}/{me.tasks.length}
      </b>
      {!touch && <kbd className="task-chip-key">T</kbd>}
    </button>
  );

  return (
    <>
      {inGame && <CanhBanner />}
      {inGame && <SabotageAlert />}
      {/* top centre: the (small) location plate on top, night clock + progress under it */}
      <div className="hud-top">
        {area && (
          <div className="area-name" key={area}>
            <span>{skin.areas[area].name}</span>
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
            <strong>{skin.roles[me.role].name}</strong>
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
                skin.roles[me.role].short
              )}
            </span>
            {killer && me.mates && me.mates.length > 0 && <span className="ability">{t('mates')}: <b style={{ color: KILLER_NAME_COLOR }}>{me.mates.join(', ')}</b></span>}
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
      {/* phones: the chip sits under the role card, keeping the left thumb area free for the joystick */}
      {me && inGame && room.phase === 'explore' && touch && <div className="task-chip-dock">{taskChip}</div>}
      {me && inGame && room.phase === 'explore' && touch && tasksOpen && !taskOpen && (
        <div className="modal-backdrop task-pop-backdrop" onClick={() => setTasksOpen(false)}>
          <div className="task-list task-pop open" onClick={(e) => e.stopPropagation()}>
            <div className="task-pop-head">
              <span className="task-head-title">{t('myTasks')}</span>
              <b className="task-count">
                {me.completedTasks.length}/{me.tasks.length}
              </b>
              <CloseButton className="task-pop-x" onClick={() => setTasksOpen(false)} label={t('close')} />
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

      {room.phase === 'explore' && (alive || killer) && (
        <div className="action-bar cluster">
          {killer && <SabotageButton slot={alive ? 'slot-left' : 'slot-main'} />}
          {killer && alive && (
            <button
              className={`round-btn kill slot-main ${killReady ? 'ready' : 'idle'} ${cdLeft ? 'cooling' : ''}`}
              disabled={!killReady}
              {...tapProps(() => send('kill', {}))}
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
          {alive && <button
            className={`round-btn report slot-top ${canReport ? 'ready' : 'idle'}`}
            disabled={!canReport}
            {...tapProps(() => send('report', {}))}
            title={`${t('report')} (L)`}
            aria-label={t('report')}
          >
            <img src={asset('common/ui/btn-report.webp')} alt="" draggable={false} />
            <kbd>L</kbd>
            <em>{t('report')}</em>
          </button>}
          {/* crew: the main button, always there and lit at an unfinished station; killers: a small one that only pops in there */}
          {alive && (!killer || taskHere) && (
            <button
              key={killer ? taskHere?.id : 'task'}
              className={`round-btn task ${killer ? 'slot-diag' : 'slot-main'} ${taskHere ? 'ready' : 'idle'}`}
              disabled={!taskHere}
              {...tapProps(() => taskHere && !uiBlocksMovement() && send('task:open', { taskId: taskHere.id }))}
              title={taskHere ? `${taskHere.title} (J)` : t('doTask')}
              aria-label={taskHere ? `${t('doTask')}: ${taskHere.title}` : t('doTask')}
            >
              <img src={asset('common/ui/btn-task.webp')} alt="" draggable={false} />
              <kbd>J</kbd>
              <em>{t('doTask')}</em>
            </button>
          )}
        </div>
      )}

      {/* tasks get an in-world "tap" badge over the station (GameScene) — the lit report button covers bodies; the bell gets its own art button */}
      {nearby?.kind === 'fix' && room.phase === 'explore' && <FixButton title={nearby.title} />}
      {nearby?.kind === 'emergency' && room.phase === 'explore' && (
        <button
          className={`round-btn bell ${nearby.used ? 'idle' : 'ready'}`}
          disabled={nearby.used}
          {...tapProps(() => send('emergency', {}))}
          title={`${nearby.title} (J)`}
          aria-label={nearby.title}
        >
          <img src={asset('common/ui/btn-bell.webp')} alt="" draggable={false} />
          <kbd>J</kbd>
          <em>{nearby.used ? t('used') : nearby.title}</em>
        </button>
      )}
    </>
  );
}
