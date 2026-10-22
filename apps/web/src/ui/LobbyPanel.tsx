import { useEffect, useState } from 'react';
import { MIN_PLAYERS } from '@hidden-truth/shared';
import { send } from '../net';
import { useStore } from '../store';
import { Chat } from './Chat';
import { useT } from '../i18n';

// dev: the host alone can ready up and start, to test without 4 clients
const DEV = import.meta.env.DEV;

export function LobbyPanel() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const t = useT();
  const isHost = room.hostId === sessionId;
  const me = room.players.find((p) => p.id === sessionId);
  const readyCount = room.players.filter((p) => p.ready).length;
  const total = room.players.length;
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
    </>
  );
}

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
