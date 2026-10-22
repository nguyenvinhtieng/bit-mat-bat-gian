import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { ChatLines, Composer, GROUP_NAME, groupAvatar } from './Zola';
import { GroupScreen, ZlIcon, useCopyInvite, type GroupView } from './GroupInfo';

/** Lobby group chat, same "Zola" look as the meeting; group options (invite, members, settings) slide in over it like Zalo. */
export function Chat({ title, onClose, closeLabel }: { compact?: boolean; title?: string; onClose?: () => void; closeLabel?: string }) {
  const chat = useStore((s) => s.chat);
  const players = useStore((s) => s.room?.players ?? []);
  const myId = useStore((s) => s.sessionId);
  const code = useStore((s) => s.room?.code ?? '');
  const t = useT();
  const copy = useCopyInvite();
  // back walks this stack; 'chat' is the root
  const [stack, setStack] = useState<GroupView[]>([]);
  const view = stack.at(-1);
  const go = (v: GroupView) => setStack((s) => [...s, v]);
  const back = () => setStack((s) => s.slice(0, -1));
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.length, view]);
  const viewTitle = view === 'members' ? t('groupMembers') : view === 'settings' ? t('groupSettings') : t('groupOptions');
  return (
    <div className="zola zl-chat">
      {view ? (
        <header className="zl-head zl-sub-head">
          <button type="button" className="zl-icon-btn" onClick={back} aria-label={t('back')} title={t('back')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <strong className="zl-sub-title">{viewTitle}</strong>
        </header>
      ) : (
        <header className="zl-head">
          <img className="zl-group-ava" src={groupAvatar} alt="" />
          <button type="button" className="zl-head-title zl-head-link" onClick={() => go('members')} title={t('groupMembers')}>
            <strong>{GROUP_NAME}</strong>
            <small>
              <ZlIcon name="users" /> {t('membersCount').replace('{n}', String(players.length))}
            </small>
          </button>
          <button type="button" className="zl-code-chip" onClick={copy} aria-label={`${t('roomCode')} ${code} · ${t('copy')}`} title={t('addMembersSub')}>
            <b>{code}</b>
            <ZlIcon name="copy" />
          </button>
          <button type="button" className="zl-icon-btn" onClick={() => go('info')} aria-label={t('groupOptions')} title={t('groupOptions')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {onClose && (
            <button type="button" className="zl-icon-btn" onClick={onClose} aria-label={closeLabel || 'Đóng nhóm chat'} title={closeLabel || 'Đóng'}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
            </button>
          )}
        </header>
      )}
      {view ? (
        <GroupScreen key={view} view={view} go={go} back={back} />
      ) : (
        <>
          <div className="zl-msgs" ref={list} role="log" aria-label={title || 'Tin nhắn nhóm'} aria-relevant="additions text">
            <div className="zl-sys">Bạn đã tham gia nhóm · gửi lời chào hàng xóm nhé!</div>
            <ChatLines myId={myId} players={players} />
          </div>
          <Composer />
        </>
      )}
    </div>
  );
}
