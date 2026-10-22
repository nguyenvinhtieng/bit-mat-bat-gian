import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GAME, MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, mapArt } from '@hidden-truth/shared';
import { send } from '../net';
import { colorHex, useStore } from '../store';
import { CloseButton, Modal, asset } from './common';
import { Chat } from './Chat';
import { useT } from '../i18n';

type LobbyIconName = 'players' | 'settings' | 'chevron' | 'clue' | 'clock' | 'globe';
function LobbyIcon({ name }: { name: LobbyIconName }) {
  return <svg className="lobby-icon" viewBox="0 0 32 32" aria-hidden="true"><use href={`${asset('maps/common/ui/saigon/lobby-icons.svg')}#${name}`} /></svg>;
}

// dev: the host alone can ready up and start, to test without 4 clients
const DEV = import.meta.env.DEV;

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
  const canStart = DEV || total >= MIN_PLAYERS;
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
  // Each lobby entry uses the device default, independent of old saved toggles.
  const [chatOpen, setChatOpen] = useState(() => !isTouch());
  const chat = useStore((s) => s.chat);
  const [seen, setSeen] = useState(() => chat.at(-1));
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
    if (chatOpen) setSeen(chat.at(-1));
  }, [chatOpen, chat]);
  const unreadMessages = chat.slice(seen ? chat.indexOf(seen) + 1 : 0).filter((m) => !m.system && m.from !== sessionId);
  const unread = unreadMessages.length;
  const latestMessage = unreadMessages.at(-1);
  const allReady = total > 0 && readyCount === total;
  const startReady = DEV ? !!me?.ready : canStart && allReady;

  return (
    <>
      <div className={`lobby-dock ${panelOpen ? '' : 'is-collapsed'}`}>
        <aside id="lobby-info" className="lobby-panel" aria-hidden={!panelOpen} inert={!panelOpen}>
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
          <button className="btn wide settings-btn players-btn" onClick={() => setShowPlayers(true)}>
            <LobbyIcon name="players" />
            <span>{t('players')}</span>
            <small>
              {total}/{MAX_PLAYERS}
            </small>
          </button>
          <button className="btn wide settings-btn" onClick={() => setShowSettings(true)}>
            <LobbyIcon name="settings" />
            <span>{t('settings')}</span>
            <small>
              {room.tasksPerPlayer}× · {room.nightMin}′
            </small>
          </button>
        </aside>
        <button
          className={`lobby-tab ${allReady ? 'all-ready' : ''}`}
          onClick={() => setPanelOpen(!panelOpen)}
          title={panelOpen ? t('panelHide') : t('panelShow')}
          aria-label={panelOpen ? t('panelHide') : t('panelShow')}
          aria-expanded={panelOpen}
          aria-controls="lobby-info"
        >
          <LobbyIcon name="chevron" />
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
              className={`ready-cta start-cta ${startReady ? 'is-go' : ''}`}
              disabled={!startReady || starting}
              title={!canStart ? t('hint') : startReady ? undefined : t('waitReady')}
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
          <Chat compact title={`Zola · ${t('chat')}`} onClose={closeChat} closeLabel={t('chatClose')} />
        </aside>
      ) : (
        <button className="chat-fab" onClick={() => setChatOpen(true)} title={`Zola · ${t('chat')}`} aria-label={`Zola · ${t('chat')}${unread ? ` (${unread})` : ''}`}>
          <span className="chat-fab-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64"><path d="M32 9C17 9 7 18 7 30c0 7 4 13 10 17l-3 9 13-6 5 1c15 0 25-9 25-21S47 9 32 9Z" /><text x="32" y="35" textAnchor="middle">Zola</text></svg>
          </span>
          <span className="chat-fab-label" aria-hidden="true">Zola</span>
          {unread > 0 && <b className="chat-badge">{unread > 99 ? '99+' : unread}</b>}
          {latestMessage && <span className="zola-notification" role="status" aria-live="polite">
            <span className="zola-notification-app">Zola <span>●</span></span>
            <strong>{latestMessage.name}</strong>
            <span className="zola-notification-text">{latestMessage.text}</span>
          </span>}
        </button>
      )}
      {showSettings && <SettingsModal isHost={isHost} onClose={() => setShowSettings(false)} />}
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
      <Modal title={`${t('players')} · ${room.players.length}/${MAX_PLAYERS}`} onClose={onClose} className="players-modal saigon-lobby-modal">
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
        <Modal title={t('kick')} onClose={() => setKickTarget(null)} className="kick-modal saigon-lobby-modal">
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

/** Edits a local draft; nothing reaches the server until the host presses Save (× / backdrop = discard). */
function SettingsModal(props: { isHost: boolean; onClose: () => void }) {
  const room = useStore((s) => s.room)!;
  const t = useT();
  const { isHost, onClose } = props;
  const [draft, setDraft] = useState({ turns: room.tasksPerPlayer, timeMin: room.nightMin, isPublic: room.isPublic });
  // guests just watch the live values; only the host edits a draft
  const { turns, timeMin, isPublic } = isHost ? draft : { turns: room.tasksPerPlayer, timeMin: room.nightMin, isPublic: room.isPublic };
  const edit = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    const msg: { tasksPerPlayer?: number; timeMin?: number } = {};
    if (turns !== room.tasksPerPlayer) msg.tasksPerPlayer = turns;
    if (timeMin !== room.nightMin) msg.timeMin = timeMin;
    if (Object.keys(msg).length) send('configure', msg);
    if (isPublic !== room.isPublic) send('host:visibility', { public: isPublic });
    onClose();
  };

  return (
    <div className="modal-backdrop settings-backdrop" onClick={onClose}>
      <div className="modal settings-modal saigon-lobby-modal lobby-settings" role="dialog" aria-label={t('settings')} onClick={(e) => e.stopPropagation()}>
        <header>
          <LobbyIcon name="settings" />
          <div>
            <h3>{t('settings')}</h3>
          </div>
          <CloseButton onClick={onClose} label={t('close')} />
        </header>
        <div className="modal-content">
          <SliderRow
            icon="clue"
            label={t('tasksPer')}
            min={GAME.tasksPerPlayerMin}
            max={GAME.tasksPerPlayerMax}
            value={turns}
            disabled={!isHost}
            onChange={(v) => edit({ turns: v })}
          />
          <SliderRow
            icon="clock"
            label={t('nightLen')}
            min={GAME.timeMinMin}
            max={GAME.timeMinMax}
            value={timeMin}
            unit={t('minutesShort')}
            disabled={!isHost}
            onChange={(v) => edit({ timeMin: v })}
          />
          <div className={`slider-row ${isHost ? '' : 'is-disabled'}`}>
            <div className="slider-head">
              <LobbyIcon name="globe" />
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
  icon: LobbyIconName;
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
        <LobbyIcon name={props.icon} />
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
