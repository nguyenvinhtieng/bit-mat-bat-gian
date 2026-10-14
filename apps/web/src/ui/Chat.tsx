import { useEffect, useRef, useState } from 'react';
import { send } from '../net';
import { colorHex, useStore } from '../store';
import { PLAYER_COLORS } from '@hidden-truth/shared';

export function Chat({ compact }: { compact?: boolean }) {
  const chat = useStore((s) => s.chat);
  const [text, setText] = useState('');
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
      <div className="chat-list" ref={list}>
        {chat.map((m, i) => (
          <div key={i} className={`chat-msg ${m.system ? 'system' : ''}`}>
            {!m.system && <b style={{ color: colorHex(PLAYER_COLORS[m.color] ?? 0xffffff) }}>{m.name}: </b>}
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={text}
          maxLength={240}
          placeholder="Nhập tin nhắn… (Enter để gửi)"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') submit();
          }}
        />
        <button className="btn small" onClick={submit}>
          Gửi
        </button>
      </div>
    </div>
  );
}
