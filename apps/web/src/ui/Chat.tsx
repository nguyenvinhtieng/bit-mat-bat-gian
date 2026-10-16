import { useEffect, useRef, useState } from 'react';
import { send } from '../net';
import { colorHex, KILLER_NAME_COLOR, useKillerIds, useStore } from '../store';
import { PLAYER_COLORS } from '@hidden-truth/shared';
import { isTouchDevice } from './Joystick';
import { CloseButton } from './common';

/** `title` + `onClose` add a header row with the shared X (lobby chat). */
export function Chat({ compact, title, onClose, closeLabel }: { compact?: boolean; title?: string; onClose?: () => void; closeLabel?: string }) {
  const chat = useStore((s) => s.chat);
  const killerIds = useKillerIds();
  const [text, setText] = useState('');
  const [touch] = useState(isTouchDevice);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.length]);
  const submit = () => {
    if (!text.trim()) return;
    send('chat', { text });
    setText('');
  };
  return (
    <div className={`chat ${compact ? 'compact' : ''}`}>
      {onClose && (
        <header className="chat-head">
          <strong>{title}</strong>
          <CloseButton onClick={onClose} label={closeLabel} className="chat-x" />
        </header>
      )}
      <div className="chat-list" ref={list}>
        {chat.map((m, i) => (
          <div key={i} className={`chat-msg ${m.system ? 'system' : ''}`}>
            {!m.system && <b style={{ color: killerIds.includes(m.from) ? KILLER_NAME_COLOR : colorHex(PLAYER_COLORS[m.color] ?? 0xffffff) }}>{m.name}: </b>}
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={text}
          maxLength={240}
          placeholder={touch ? 'Nhập tin nhắn…' : 'Nhập tin nhắn… (Enter để gửi)'}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') submit();
          }}
        />
        <button className="chat-send" onClick={submit} disabled={!text.trim()} title="Gửi" aria-label="Gửi">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
