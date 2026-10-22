import { useState } from 'react';
import { PLAYER_COLORS } from '@hidden-truth/shared';
import { send } from '../net';
import { colorHex, KILLER_NAME_COLOR, useKillerIds, useStore, type PlayerView } from '../store';
import { Sprite } from './Cinematic';
import { isTouchDevice } from './Joystick';
import { asset } from './common';

/** Lobby and meeting chat are staged as a group in "Zola", a made-up messenger (no real brand names). */
export const GROUP_NAME = 'Hội CRAB · Hẻm 42';
export const groupAvatar = asset('maps/common/ui/saigon/crab-dispatch.svg');
/** RoomView players carry the hex colour; the sprite renderer wants the palette index. */
export const colorIndex = (hex: number) => Math.max(0, PLAYER_COLORS.indexOf(hex));
const msgTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Round chat avatar cropped from the player sprite. */
export function Avatar({ color, size = 36, dim }: { color: number; size?: number; dim?: boolean }) {
  return (
    <span className={`zl-ava ${dim ? 'dim' : ''}`} style={{ width: size, height: size, '--pc': colorHex(PLAYER_COLORS[color] ?? 0xffffff) } as React.CSSProperties}>
      <Sprite color={color} dir="down" scale={size / 30} />
    </span>
  );
}

/** Chat bubbles grouped by sender; system lines become centred pills. */
export function ChatLines({ myId, players }: { myId: string; players: PlayerView[] }) {
  const chat = useStore((s) => s.chat);
  const killerIds = useKillerIds();
  return (
    <>
      {chat.map((m, i) => {
        if (m.system)
          return (
            <div key={i} className="zl-sys">
              {m.text}
            </div>
          );
        const mine = m.from === myId;
        const prev = chat[i - 1];
        const head = !prev || prev.system || prev.from !== m.from;
        const off = players.find((p) => p.id === m.from)?.alive === false;
        return (
          <div key={i} className={`zl-row ${mine ? 'me' : ''} ${head ? 'head' : ''}`}>
            {!mine && (head ? <Avatar color={m.color} size={32} dim={off} /> : <span className="zl-ava-gap" />)}
            <div className="zl-bubble">
              {!mine && head && (
                <b className="zl-sender" style={killerIds.includes(m.from) ? { color: KILLER_NAME_COLOR } : undefined}>
                  {m.name}
                </b>
              )}
              <span className="zl-text">{m.text}</span>
              {Number.isFinite(m.t) && <time dateTime={new Date(m.t).toISOString()}>{msgTime.format(m.t)}</time>}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Composer({ enabled = true, lockedHint = '' }: { enabled?: boolean; lockedHint?: string }) {
  const [text, setText] = useState('');
  const [touch] = useState(isTouchDevice);
  const submit = () => {
    if (!text.trim()) return false;
    send('chat', { text });
    setText('');
    return true;
  };
  return (
    <div className="zl-compose">
      <input
        aria-label="Tin nhắn"
        value={text}
        maxLength={240}
        disabled={!enabled}
        placeholder={!enabled ? lockedHint : touch ? 'Nhập tin nhắn…' : `Nhập tin nhắn tới ${GROUP_NAME}`}
        enterKeyHint="send"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          // Release focus after sending so movement keys reach the game again.
          if (e.key === 'Enter' && submit()) e.currentTarget.blur();
        }}
      />
      <button className="zl-send" onClick={submit} disabled={!enabled || !text.trim()} aria-label="Gửi" title="Gửi">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 12 20 4l-4 16-4-6-8-2Z" />
          <path d="m12 14 8-10" />
        </svg>
      </button>
    </div>
  );
}
