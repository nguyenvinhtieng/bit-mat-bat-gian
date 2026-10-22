import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { ChatLines, Composer, GROUP_NAME, groupAvatar } from './Zola';

/** Lobby group chat, same "Zola" look as the meeting but without the member list. */
export function Chat({ title, onClose, closeLabel }: { compact?: boolean; title?: string; onClose?: () => void; closeLabel?: string }) {
  const chat = useStore((s) => s.chat);
  const players = useStore((s) => s.room?.players ?? []);
  const myId = useStore((s) => s.sessionId);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.length]);
  return (
    <div className="zola zl-chat">
      <header className="zl-head">
        <img className="zl-group-ava" src={groupAvatar} alt="" />
        <div className="zl-head-title">
          <strong>{GROUP_NAME}</strong>
          <small>{players.length} thành viên</small>
        </div>
        {onClose && (
          <button type="button" className="zl-icon-btn" onClick={onClose} aria-label={closeLabel || 'Đóng nhóm chat'} title={closeLabel || 'Đóng'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        )}
      </header>
      <div className="zl-msgs" ref={list} role="log" aria-label={title || 'Tin nhắn nhóm'} aria-relevant="additions text">
        <div className="zl-sys">Bạn đã tham gia nhóm · gửi lời chào hàng xóm nhé!</div>
        <ChatLines myId={myId} players={players} />
      </div>
      <Composer />
    </div>
  );
}
