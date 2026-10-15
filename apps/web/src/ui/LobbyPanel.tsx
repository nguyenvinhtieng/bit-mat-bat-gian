import { useState } from 'react';
import { MIN_RECOMMENDED_PLAYERS, TASK_IDS, mapArt } from '@hidden-truth/shared';
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
          <GuideButton variant="lobby" onClick={() => setShowGuide(true)} />
          <div className="ready-status">
            <div className="ready-bar">
              <div style={{ width: `${total ? (readyCount / total) * 100 : 0}%` }} />
            </div>
            <span>
              {readyCount}/{total} sẵn sàng
            </span>
          </div>
          <button className="btn settings-btn wide" onClick={() => setShowSettings(true)}>
            <img src={asset('common/ui/settings.webp')} alt="" draggable={false} />
            <span>{t('settings')}</span>
            <small>
              {room.tasksPerPlayer} · {killers}
            </small>
          </button>
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
      {showSettings && (
        <div className="modal-backdrop settings-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" role="dialog" aria-label={t('settings')} onClick={(e) => e.stopPropagation()}>
            <header>
              <img className="settings-crest" src={asset('common/ui/settings.webp')} alt="" draggable={false} />
              <div>
                <h3>{t('settings')}</h3>
                <small>{t('settingsSub')}</small>
              </div>
              <button className="close" onClick={() => setShowSettings(false)} aria-label={t('close')}>
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
                value={room.tasksPerPlayer}
                disabled={!isHost}
                onChange={(v) => send('configure', { tasksPerPlayer: v })}
              />
              <SliderRow
                icon="common/ui/count-killer.webp"
                tone="killer"
                label={t('killersCount')}
                hint={t('killersHint')}
                min={1}
                max={maxKillers}
                value={killers}
                disabled={!isHost}
                onChange={(v) => send('configure', { killers: v })}
              />
              {!isHost && <p className="settings-note">{t('hostOnly')}</p>}
              <button className="btn primary wide" onClick={() => setShowSettings(false)}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showGuide && <Guide onClose={() => setShowGuide(false)} />}
    </>
  );
}

function SliderRow(props: {
  icon: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  tone?: 'killer';
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
          <small>{props.hint}</small>
        </div>
        <b className="slider-value" key={value}>
          {value}
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
