import { useEffect, useState } from 'react';
import { GAME, MIN_RECOMMENDED_PLAYERS, TASK_IDS, autoNightMin, killersFor, mapArt } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { colorHex, useStore } from '../store';
import { asset } from './common';
import { Chat } from './Chat';
import { useT } from '../i18n';
import { Guide, GuideButton } from './Guide';

export function LobbyPanel() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const toast = useStore((s) => s.toast);
  const t = useT();
  const ping = useStore((s) => s.ping);
  const isHost = room.hostId === sessionId;
  const me = room.players.find((p) => p.id === sessionId);
  const link = `${location.origin}/join/${room.code}`;
  const readyCount = room.players.filter((p) => p.ready).length;
  const total = room.players.length;
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const maxKillers = Math.max(1, Math.floor(total / 2));
  const autoKillers = total >= 8 ? 2 : 1;
  const killers = Math.min(room.killers || autoKillers, maxKillers);
  // always open on entering the lobby so players see it exists; the tab folds it away
  const [panelOpen, setPanelOpen] = useState(true);
  const [chatOpen, setChatOpen] = usePersisted('tht:lobbyChat', !isTouch());
  const chat = useStore((s) => s.chat);
  const [seen, setSeen] = useState(chat.length);
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
            <img className="lobby-thumb" src={asset(mapArt(room.mapSlug, 'thumb'))} alt="" />
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

          <h4 className="lobby-players-title">
            {t('players')} ({total}/10)
            {ping > 0 && <small className="muted"> · {t('ping')} {ping}ms</small>}
          </h4>
          <ul className="player-list">
            {room.players.map((p) => (
              <li key={p.id} className={p.ready ? 'is-ready' : ''}>
                <i className="dot" style={{ background: colorHex(p.color) }} />
                <span className="pname">{p.name}</span>
                {p.id === room.hostId && <em className="tag">host</em>}
                {p.ready && <em className="tag ok">✓ {t('ready')}</em>}
                {isHost && p.id !== sessionId && (
                  <button
                    className="kick-btn"
                    title={t('kick')}
                    aria-label={`${t('kick')} ${p.name}`}
                    onClick={() => {
                      if (confirm(t('kickConfirm').replace('{name}', p.name))) send('host:kick', { target: p.id });
                    }}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          {total < MIN_RECOMMENDED_PLAYERS && <p className="muted small lobby-hint">{t('hint')}</p>}

          <div className="lobby-footer">
            <div className="ready-status">
              <div className="ready-bar">
                <div style={{ width: `${total ? (readyCount / total) * 100 : 0}%` }} />
              </div>
              <span>
                {readyCount}/{total} {t('readyOf')}
              </span>
            </div>
            <button
              className={`btn big wide ${me?.ready ? '' : 'primary pulse'}`}
              onClick={() => send('ready', { ready: !me?.ready })}
            >
              {me?.ready ? t('unready') : t('readyBtn')}
            </button>
            {isHost && (
              <button className="btn big wide primary start" onClick={() => send('start', {})}>
                ▶ {t('start')} ({readyCount}/{total})
              </button>
            )}
            <button className="btn ghost small wide" onClick={leaveRoom}>
              {t('leave')}
            </button>
          </div>
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
      {!panelOpen && allReady && (
        <div className="all-ready-bar" role="status">
          <span>✓ {isHost ? t('allReady') : t('allReadyWait')}</span>
          {isHost && (
            <button className="btn primary start" onClick={() => send('start', {})}>
              ▶ {t('start')}
            </button>
          )}
        </div>
      )}
      <div className={`corner-tools ${chatOpen ? 'above-chat' : ''}`}>
        <GuideButton variant="icon" onClick={() => setShowGuide(true)} />
        <button
          className="icon-tool"
          onClick={() => setShowSettings(true)}
          title={`${t('settings')} · ${room.tasksPerPlayer} · ${killers} · ${room.nightMin}′`}
          aria-label={t('settings')}
        >
          <img src={asset('common/ui/settings.webp')} alt="" draggable={false} />
        </button>
      </div>
      {chatOpen ? (
        <aside className="lobby-chat">
          <button className="chat-min" onClick={() => setChatOpen(false)} title={t('chatClose')} aria-label={t('chatClose')}>
            –
          </button>
          <Chat compact />
        </aside>
      ) : (
        <button className="chat-fab" onClick={() => setChatOpen(true)} title={t('chat')} aria-label={t('chat')}>
          <img src={asset('common/ui/mobile/btn-chat.webp')} alt="" draggable={false} />
          {unread > 0 && <b className="chat-badge">{unread > 9 ? '9+' : unread}</b>}
        </button>
      )}
      {showSettings && <SettingsModal isHost={isHost} total={total} killers={killers} maxKillers={maxKillers} onClose={() => setShowSettings(false)} />}
      {showGuide && <Guide onClose={() => setShowGuide(false)} />}
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
  const [draft, setDraft] = useState({ tasks: room.tasksPerPlayer, killers: props.killers, nightAuto: room.nightAuto, nightMin: room.nightMin });
  // guests just watch the live values; only the host edits a draft
  const { tasks, killers, nightAuto, nightMin } = isHost
    ? draft
    : { tasks: room.tasksPerPlayer, killers: props.killers, nightAuto: room.nightAuto, nightMin: room.nightMin };
  const edit = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  // auto preview mirrors the server: an untouched auto killer count follows the room size
  const previewKillers = !room.killers && killers === props.killers ? killersFor(total) : killers;
  const shownNight = nightAuto && isHost ? autoNightMin(total, previewKillers, tasks) : nightMin;

  const save = () => {
    const msg: { tasksPerPlayer?: number; killers?: number; nightMin?: number; nightAuto?: boolean } = {};
    if (tasks !== room.tasksPerPlayer) msg.tasksPerPlayer = tasks;
    if (killers !== props.killers) msg.killers = killers;
    if (nightAuto && !room.nightAuto) msg.nightAuto = true;
    if (!nightAuto && (room.nightAuto || nightMin !== room.nightMin)) msg.nightMin = nightMin;
    if (Object.keys(msg).length) send('configure', msg);
    onClose();
  };

  return (
    <div className="modal-backdrop settings-backdrop" onClick={onClose}>
      <div className="modal settings-modal" role="dialog" aria-label={t('settings')} onClick={(e) => e.stopPropagation()}>
        <header>
          <img className="settings-crest" src={asset('common/ui/settings.webp')} alt="" draggable={false} />
          <div>
            <h3>{t('settings')}</h3>
            <small>{t('settingsSub')}</small>
          </div>
          <button className="close" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </header>
        <div className="modal-content">
          <SliderRow
            icon="common/ui/clue.webp"
            label={t('tasksPer')}
            hint={t('tasksPerHint')}
            min={1}
            max={TASK_IDS.length}
            value={tasks}
            disabled={!isHost}
            onChange={(v) => edit({ tasks: v })}
          />
          <SliderRow
            icon="common/ui/count-killer.webp"
            tone="killer"
            label={t('killersCount')}
            min={1}
            max={maxKillers}
            value={killers}
            disabled={!isHost}
            onChange={(v) => edit({ killers: v })}
          />
          <SliderRow
            icon="maps/co-do-hue/minigames/hue-mg-moon-4.webp"
            label={t('nightLen')}
            hint={nightAuto ? t('nightAutoHint') : t('nightManualHint')}
            min={GAME.nightMinMin}
            max={GAME.nightMinMax}
            value={shownNight}
            unit={t('minutesShort')}
            disabled={!isHost}
            onChange={(v) => edit({ nightAuto: false, nightMin: v })}
            extra={
              nightAuto ? (
                <em className="slider-badge auto">{t('auto')}</em>
              ) : (
                <button className="slider-badge reset" disabled={!isHost} onClick={() => edit({ nightAuto: true })}>
                  ↺ {t('auto')}
                </button>
              )
            }
          />
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
  hint?: string;
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  tone?: 'killer';
  unit?: string;
  extra?: React.ReactNode;
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
          {props.hint && <small>{props.hint}</small>}
        </div>
        {props.extra}
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
