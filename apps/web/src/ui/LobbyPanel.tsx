import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_MAP_SLUG, GAME, MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, autoNightMin, clampKillers, killersFor, maxKillersFor, mapArt, mapSkin } from '@hidden-truth/shared';
import { send } from '../net';
import { colorHex, useStore } from '../store';
import { CloseButton, Modal, asset } from './common';
import { Chat } from './Chat';
import { useT } from '../i18n';

export function LobbyPanel() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const toast = useStore((s) => s.toast);
  const t = useT();
  const isHost = room.hostId === sessionId;
  const me = room.players.find((p) => p.id === sessionId);
  const link = `${location.origin}/join/${room.code}`;
  const readyCount = room.players.filter((p) => p.ready).length;
  const total = room.players.length;
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const maxKillers = maxKillersFor(total);
  const killers = room.killers ? clampKillers(room.killers, total) : killersFor(total);
  const canStart = total >= MIN_PLAYERS;
  // the panel unmounts when the phase flips; the timeout only matters if the server refused (toast explains why)
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (!starting) return;
    const id = setTimeout(() => setStarting(false), 5000);
    return () => clearTimeout(id);
  }, [starting]);
  const start = () => {
    if (starting) return;
    setStarting(true);
    send('start', {});
  };
  // always open on entering the lobby so players see it exists; the tab folds it away
  const [panelOpen, setPanelOpen] = useState(true);
  const [chatOpen, setChatOpen] = usePersisted('tht:lobbyChat', !isTouch());
  const chat = useStore((s) => s.chat);
  const [seen, setSeen] = useState(chat.length);
  const [chatClosing, setChatClosing] = useState(false);
  const closeChat = () => {
    if (chatClosing) return;
    setChatClosing(true);
    setTimeout(() => {
      setChatOpen(false);
      setChatClosing(false);
    }, 140);
  };
  useEffect(() => {
    if (chatOpen) setSeen(chat.length);
  }, [chatOpen, chat.length]);
  const unread = chat.slice(seen).filter((m) => !m.system && m.from !== sessionId).length;
  const allReady = total > 0 && readyCount === total;

  return (
    <>
      <div className={`lobby-dock ${panelOpen ? '' : 'is-collapsed'}`}>
        <aside className="lobby-panel" aria-hidden={!panelOpen}>
          <div className="lobby-head">
            <img className="lobby-thumb" src={asset(mapArt(DEFAULT_MAP_SLUG, 'thumb'))} alt="" />
            <div className="room-code">
              <span>{t('roomCode')}</span>
              <strong>{room.code}</strong>
            </div>
            <button
              className="btn small copy-link-btn"
              title={t('copyLink')}
              aria-label={t('copyLink')}
              onClick={() => {
                navigator.clipboard?.writeText(link);
                toast({ text: t('linkCopied'), kind: 'success' });
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
              </svg>
            </button>
          </div>
          <button className="btn wide settings-btn players-btn" onClick={() => setShowPlayers(true)}>
            <span className="players-btn-icon" aria-hidden>
              👥
            </span>
            <span>{t('players')}</span>
            <small>
              {total}/{MAX_PLAYERS}
            </small>
          </button>
          <button className="btn wide settings-btn" onClick={() => setShowSettings(true)}>
            <img src={asset('maps/common/ui/settings.webp')} alt="" draggable={false} />
            <span>{t('settings')}</span>
            <small>
              {room.tasksPerPlayer} · {killers} · {room.nightMin}′
            </small>
          </button>
        </aside>
        <button
          className={`lobby-tab ${allReady ? 'all-ready' : ''}`}
          onClick={() => setPanelOpen(!panelOpen)}
          title={panelOpen ? t('panelHide') : t('panelShow')}
          aria-label={panelOpen ? t('panelHide') : t('panelShow')}
          aria-expanded={panelOpen}
        >
          <i className="lobby-tab-arrow" aria-hidden />
          <b>
            {readyCount}/{total}
          </b>
        </button>
      </div>
      <div className={`ready-dock ${allReady ? 'all-ready' : ''} ${chatOpen ? 'with-chat' : ''}`}>
        <div className="ready-dock-status" role="status">
          <div className="ready-bar">
            <div style={{ width: `${total ? (readyCount / total) * 100 : 0}%` }} />
          </div>
          <span>{allReady ? `✓ ${t('allReady')}` : `${readyCount}/${total} ${t('readyOf')}`}</span>
        </div>
        <div className="ready-dock-actions">
          <button
            className={`ready-cta ${me?.ready ? 'is-ready' : ''} ${canStart ? '' : 'has-need'}`}
            title={canStart ? undefined : t('needPlayersToReady')}
            disabled={!canStart && !me?.ready}
            aria-pressed={!!me?.ready}
            onClick={() => send('ready', { ready: !me?.ready })}
          >
            <span className="ready-cta-icon" aria-hidden>
              {me?.ready ? '✓' : '✋'}
            </span>
            <span>{me?.ready ? t('unready') : t('readyBtn')}</span>
            {!canStart && (
              <small className="need-players" aria-hidden>
                👥 {total}/{MIN_PLAYERS}
              </small>
            )}
          </button>
          {isHost && (
            <button
              className="ready-cta start-cta"
              disabled={!canStart || !allReady || starting}
              title={!canStart ? t('hint') : allReady ? undefined : t('waitReady')}
              onClick={start}
            >
              <span className="ready-cta-icon" aria-hidden>
                ▶
              </span>
              <span>{starting ? t('starting') : t('start')}</span>
            </button>
          )}
        </div>
      </div>
      {chatOpen ? (
        <aside className={`lobby-chat ${chatClosing ? 'closing' : ''}`}>
          <Chat compact title={t('chat')} onClose={closeChat} closeLabel={t('chatClose')} />
        </aside>
      ) : (
        <button className="chat-fab" onClick={() => setChatOpen(true)} title={t('chat')} aria-label={t('chat')}>
          <img src={asset('maps/common/ui/mobile/btn-chat.webp')} alt="" draggable={false} />
          {unread > 0 && <b className="chat-badge">{unread > 9 ? '9+' : unread}</b>}
        </button>
      )}
      {showSettings && <SettingsModal isHost={isHost} total={total} killers={killers} maxKillers={maxKillers} onClose={() => setShowSettings(false)} />}
      {showPlayers && createPortal(<PlayersModal isHost={isHost} onClose={() => setShowPlayers(false)} />, document.body)}
    </>
  );
}

/** Everyone in the lobby; the host can kick from here (server re-checks host + lobby phase). */
function PlayersModal({ isHost, onClose }: { isHost: boolean; onClose: () => void }) {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const t = useT();
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const kick = () => {
    if (kickTarget) send('host:kick', { target: kickTarget.id });
    setKickTarget(null);
  };
  return (
    <>
      <Modal title={`${t('players')} · ${room.players.length}/${MAX_PLAYERS}`} onClose={onClose} className="players-modal">
        <ul className="player-list players-modal-list">
          {room.players.map((p) => (
            <li key={p.id} className={`${p.ready ? 'is-ready' : ''} ${p.connected ? '' : 'off'}`}>
              <i className="pdot" style={{ background: colorHex(PLAYER_COLORS[p.color] ?? 0xffffff) }} aria-hidden />
              <span className="pname">
                {p.name}
                {p.id === sessionId && <em className="pme"> ({t('you')})</em>}
              </span>
              {p.micOn && (
                <span className="ptag mic" title="Micro">
                  🎙
                </span>
              )}
              {p.id === room.hostId && (
                <span className="ptag host" title={t('host')}>
                  👑
                </span>
              )}
              <span className={`ptag ${p.ready ? 'ready' : 'wait'}`}>{p.ready ? `✓ ${t('ready')}` : '…'}</span>
              {isHost && p.id !== sessionId && (
                <button className="kick-btn" onClick={() => setKickTarget({ id: p.id, name: p.name })}>
                  {t('kick')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Modal>
      {/* sibling, not child: the players modal's backdrop would otherwise sit under this one */}
      {kickTarget && (
        <Modal title={t('kick')} onClose={() => setKickTarget(null)} className="kick-modal">
          <p className="kick-warn">{t('kickConfirm').replace('{name}', kickTarget.name)}</p>
          <div className="exit-actions">
            <button type="button" className="btn ghost" onClick={() => setKickTarget(null)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn danger" onClick={kick} autoFocus>
              {t('kick')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Per-viewer UI toggle remembered across reloads (storage may be unavailable — then it just isn't remembered). */
function usePersisted(key: string, fallback: boolean) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : raw === '1';
    } catch {
      return fallback;
    }
  });
  const set = (next: boolean) => {
    setV(next);
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  return [v, set] as const;
}

/** Edits a local draft; nothing reaches the server until the host presses Save (× / backdrop = discard). */
function SettingsModal(props: { isHost: boolean; total: number; killers: number; maxKillers: number; onClose: () => void }) {
  const room = useStore((s) => s.room)!;
  const t = useT();
  const { isHost, total, maxKillers, onClose } = props;
  const [draft, setDraft] = useState({
    tasks: room.tasksPerPlayer,
    killers: props.killers,
    nightAuto: room.nightAuto,
    nightMin: room.nightMin,
    isPublic: room.isPublic,
  });
  // guests just watch the live values; only the host edits a draft
  const { tasks, killers, nightAuto, nightMin, isPublic } = isHost
    ? draft
    : {
        tasks: room.tasksPerPlayer,
        killers: props.killers,
        nightAuto: room.nightAuto,
        nightMin: room.nightMin,
        isPublic: room.isPublic,
      };
  const edit = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const maxTasks = mapSkin(room.mapSlug).taskIds.length;
  // auto preview mirrors the server: an untouched auto killer count follows the room size
  const previewKillers = !room.killers && killers === props.killers ? killersFor(total) : killers;
  const shownNight = nightAuto && isHost ? autoNightMin(total, previewKillers, tasks) : nightMin;

  const save = () => {
    const msg: {
      tasksPerPlayer?: number;
      killers?: number;
      nightMin?: number;
      nightAuto?: boolean;
    } = {};
    if (tasks !== room.tasksPerPlayer) msg.tasksPerPlayer = tasks;
    if (killers !== props.killers) msg.killers = killers;
    if (nightAuto && !room.nightAuto) msg.nightAuto = true;
    if (!nightAuto && (room.nightAuto || nightMin !== room.nightMin)) msg.nightMin = nightMin;
    if (Object.keys(msg).length) send('configure', msg);
    if (isPublic !== room.isPublic) send('host:visibility', { public: isPublic });
    onClose();
  };

  return (
    <div className="modal-backdrop settings-backdrop" onClick={onClose}>
      <div className="modal settings-modal" role="dialog" aria-label={t('settings')} onClick={(e) => e.stopPropagation()}>
        <header>
          <img className="settings-crest" src={asset('maps/common/ui/settings.webp')} alt="" draggable={false} />
          <div>
            <h3>{t('settings')}</h3>
          </div>
          <CloseButton onClick={onClose} label={t('close')} />
        </header>
        <div className="modal-content">
          <SliderRow
            icon="maps/common/ui/clue.webp"
            label={t('tasksPer')}
            min={1}
            max={maxTasks}
            value={tasks}
            disabled={!isHost}
            onChange={(v) => edit({ tasks: v, nightAuto: true })}
          />
          <SliderRow
            icon="maps/common/ui/count-killer.webp"
            tone="killer"
            label={t('killersCount')}
            min={1}
            max={maxKillers}
            value={killers}
            disabled={!isHost}
            onChange={(v) => edit({ killers: v, nightAuto: true })}
          />
          <SliderRow
            icon={`${mapSkin(room.mapSlug).art.nightMarker}.webp`}
            label={t('nightLen')}
            min={GAME.nightMinMin}
            max={GAME.nightMinMax}
            value={shownNight}
            unit={t('minutesShort')}
            disabled={!isHost}
            onChange={(v) => edit({ nightAuto: false, nightMin: v })}
          />
          <div className={`slider-row ${isHost ? '' : 'is-disabled'}`}>
            <div className="slider-head">
              <img src={asset('maps/common/ui/home/globe.webp')} alt="" draggable={false} />
              <div className="slider-text">
                <strong>{t('roomVisibility')}</strong>
              </div>
            </div>
            <div className="vis-toggle" role="radiogroup" aria-label={t('roomVisibility')}>
              {[false, true].map((pub) => (
                <button
                  key={String(pub)}
                  type="button"
                  role="radio"
                  aria-checked={isPublic === pub}
                  className={`btn small ${isPublic === pub ? 'primary' : 'ghost'}`}
                  disabled={!isHost}
                  onClick={() => edit({ isPublic: pub })}
                >
                  {pub ? `🌐 ${t('roomPublic')}` : `🔒 ${t('roomPrivate')}`}
                </button>
              ))}
            </div>
          </div>
          {isHost ? (
            <button className="btn primary wide" onClick={save}>
              {t('save')}
            </button>
          ) : (
            <p className="settings-note">{t('hostOnly')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderRow(props: {
  icon: string;
  label: string;
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  tone?: 'killer';
  unit?: string;
  onChange: (v: number) => void;
}) {
  const { min, max, value } = props;
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 100;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className={`slider-row ${props.tone ?? ''} ${props.disabled ? 'is-disabled' : ''}`}>
      <div className="slider-head">
        <img src={asset(props.icon)} alt="" draggable={false} />
        <div className="slider-text">
          <strong>{props.label}</strong>
        </div>
        <b className="slider-value" key={value}>
          {value}
          {props.unit && <small>{props.unit}</small>}
        </b>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={props.disabled || max === min}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        aria-label={props.label}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <div className="slider-ticks" aria-hidden>
        {steps.map((n) => (
          <span key={n} className={n === value ? 'on' : ''} onClick={() => !props.disabled && props.onChange(n)}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
