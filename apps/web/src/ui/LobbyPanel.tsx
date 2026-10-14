import { useState } from 'react';
import { MIN_RECOMMENDED_PLAYERS, mapArt } from '@hidden-truth/shared';
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

  return (
    <>
      <aside className="lobby-panel">
        <div className="lobby-head">
          <img className="lobby-thumb" src={asset(mapArt(room.mapSlug, 'thumb'))} alt="" />
          <div className="room-code">
            <span>{t('roomCode')}</span>
            <strong>{room.code}</strong>
          </div>
          <button
            className="btn small"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              toast({ text: t('linkCopied'), kind: 'success' });
            }}
          >
            {t('copyLink')}
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
              <em className={`tag ${p.ready ? 'ok' : 'wait'}`}>{p.ready ? `✓ ${t('ready')}` : '…'}</em>
            </li>
          ))}
        </ul>
        {total < MIN_RECOMMENDED_PLAYERS && <p className="muted small lobby-hint">{t('hint')}</p>}

        <div className="lobby-footer">
          <GuideButton variant="lobby" onClick={() => setShowGuide(true)} />
          <div className="ready-status">
            <div className="ready-bar">
              <div style={{ width: `${total ? (readyCount / total) * 100 : 0}%` }} />
            </div>
            <span>
              {readyCount}/{total} sẵn sàng
            </span>
          </div>
          {isHost && (
            <label className="check">
              <input type="checkbox" checked={room.quick} onChange={(e) => send('configure', { quick: e.target.checked })} />
              {t('quick')}
            </label>
          )}
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
      <aside className="lobby-chat">
        <Chat compact />
      </aside>
      {showGuide && <Guide onClose={() => setShowGuide(false)} />}
    </>
  );
}
