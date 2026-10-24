import { useState } from 'react';
import { GAME, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, copsValid, maxCops } from '@hidden-truth/shared';
import { send } from '../net';
import { useStore } from '../store';
import { useT } from '../i18n';
import { Avatar, GROUP_NAME, colorIndex, groupAvatar } from './Zola';

/** Sub-screens of the lobby chat, staged like Zalo's group "Options" panel. */
export type GroupView = 'info' | 'members' | 'settings';

type IconName = 'link' | 'users' | 'gear' | 'add' | 'edit' | 'chev' | 'copy';
const ICONS: Record<IconName, string> = {
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7M22 21v-1a6 6 0 0 0-4-5.6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15.1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.3 8.2l-.1-.1A2 2 0 1 1 7 5.3l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  add: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 11-3.3M19 14v6M16 17h6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  chev: 'm9 6 6 6-6 6',
  copy: 'M9 9h10v10H9zM5 15V5h10',
};
export function ZlIcon({ name }: { name: IconName }) {
  return (
    <svg className="zl-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export const inviteLink = (code: string) => `${location.origin}/join/${code}`;
export function useCopyInvite() {
  const code = useStore((s) => s.room?.code ?? '');
  const toast = useStore((s) => s.toast);
  const t = useT();
  return () => {
    navigator.clipboard?.writeText(inviteLink(code));
    toast({ text: t('linkCopied'), kind: 'success' });
  };
}

export function GroupScreen({ view, go, back }: { view: GroupView; go: (v: GroupView) => void; back: () => void }) {
  if (view === 'members') return <Members />;
  if (view === 'settings') return <GroupSettings onSaved={back} />;
  return <Options go={go} />;
}

function Options({ go }: { go: (v: GroupView) => void }) {
  const room = useStore((s) => s.room)!;
  const t = useT();
  const copy = useCopyInvite();
  return (
    <div className="zl-pane">
      <section className="zl-card zl-group-card">
        <img className="zl-group-ava big" src={groupAvatar} alt="" />
        <strong>{GROUP_NAME}</strong>
        <span className="zl-code">
          {t('roomCode')} <b>{room.code}</b>
        </span>
        <div className="zl-quick">
          <button type="button" onClick={copy}>
            <i><ZlIcon name="link" /></i>
            <span>{t('copy')} link</span>
          </button>
          <button type="button" onClick={() => go('members')}>
            <i><ZlIcon name="users" /></i>
            <span>{t('groupMembers')}</span>
          </button>
          <button type="button" onClick={() => go('settings')}>
            <i><ZlIcon name="gear" /></i>
            <span>{t('groupSettings')}</span>
          </button>
        </div>
      </section>
      <section className="zl-card">
        <div className="zl-item">
          <ZlIcon name="link" />
          <div className="zl-item-text">
            <span>{t('groupLink')}</span>
            <small className="zl-link">{inviteLink(room.code).replace(/^https?:\/\//, '')}</small>
          </div>
          <button type="button" className="zl-btn ghost small" onClick={copy}>
            {t('copy')}
          </button>
        </div>
        <button type="button" className="zl-item" onClick={() => go('members')}>
          <ZlIcon name="users" />
          <span className="zl-item-text">{t('viewMembers').replace('{n}', String(room.players.length))}</span>
          <ZlIcon name="chev" />
        </button>
        <button type="button" className="zl-item" onClick={() => go('settings')}>
          <ZlIcon name="gear" />
          <span className="zl-item-text">
            <span>{t('groupSettings')}</span>
            <small>
              {room.tasksPerPlayer}× · {room.nightMin} {t('minutesShort')} · {room.isPublic ? t('roomPublic') : t('roomPrivate')}
            </small>
          </span>
          <ZlIcon name="chev" />
        </button>
      </section>
    </div>
  );
}

/** Everyone in the lobby; rename yourself, and the host can remove others (server re-checks host + lobby phase). */
function Members() {
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.sessionId);
  const t = useT();
  const copy = useCopyInvite();
  const isHost = room.hostId === me;
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  // host first, then me, then join order — like Zalo's admin-on-top list
  const rank = (id: string) => (id === room.hostId ? 0 : id === me ? 1 : 2);
  const players = [...room.players].sort((a, b) => rank(a.id) - rank(b.id));
  return (
    <div className="zl-pane">
      <section className="zl-card">
        {room.players.length < MAX_PLAYERS && (
          <button type="button" className="zl-item" onClick={copy}>
            <i className="zl-item-badge"><ZlIcon name="add" /></i>
            <span className="zl-item-text">
              <span>{t('addMembers')}</span>
              <small>{t('addMembersSub')}</small>
            </span>
          </button>
        )}
        <h4 className="zl-sec-title">
          {t('membersCount').replace('{n}', `${room.players.length}/${MAX_PLAYERS}`)}
        </h4>
        <ul className="zl-member-list">
          {players.map((p) => (
            <li key={p.id} className={p.connected ? '' : 'off'}>
              <Avatar color={colorIndex(p.color)} size={40} dim={!p.connected} />
              <div className="zl-mem">
                <b>
                  {p.name}
                  {p.id === me && <em> ({t('you')})</em>}
                </b>
                <small>
                  {p.id === room.hostId && <span className="zl-role">{t('groupLeader')}</span>}
                  <span className={p.ready ? 'zl-ready' : ''}>{p.ready ? `✓ ${t('ready')}` : t('waiting')}</span>
                  {p.micOn && <span aria-label="Micro"> · 🎙</span>}
                </small>
              </div>
              {p.id === me && (
                <button type="button" className="zl-icon-btn" onClick={() => setRenaming(true)} aria-label={t('changeNickname')} title={t('changeNickname')}>
                  <ZlIcon name="edit" />
                </button>
              )}
              {isHost && p.id !== me && (
                <button type="button" className="zl-btn ghost small zl-danger" onClick={() => setKickTarget({ id: p.id, name: p.name })}>
                  {t('kickFromGroup')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {renaming && <RenameDialog current={room.players.find((p) => p.id === me)?.name ?? ''} onClose={() => setRenaming(false)} />}
      {kickTarget && (
        <Dialog title={t('kickFromGroup')} onClose={() => setKickTarget(null)}>
          <p>{t('kickConfirm').replace('{name}', kickTarget.name)}</p>
          <div className="zl-dialog-actions">
            <button type="button" className="zl-btn ghost" onClick={() => setKickTarget(null)}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="zl-btn primary zl-danger-fill"
              autoFocus
              onClick={() => {
                send('host:kick', { target: kickTarget.id });
                setKickTarget(null);
              }}
            >
              {t('kickFromGroup')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function RenameDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(current);
  const clean = name.trim();
  const submit = () => {
    if (clean && clean !== current) send('rename', { name: clean });
    onClose();
  };
  return (
    <Dialog title={t('changeNickname')} onClose={onClose}>
      <input
        className="zl-input"
        value={name}
        maxLength={NAME_MAX}
        autoFocus
        aria-label={t('changeNickname')}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="zl-dialog-actions">
        <button type="button" className="zl-btn ghost" onClick={onClose}>
          {t('cancel')}
        </button>
        <button type="button" className="zl-btn primary" disabled={!clean || clean === current} onClick={submit}>
          {t('save')}
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="zl-modal-bg" onClick={onClose}>
      <div className="zl-modal zl-dialog" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header>
          <h4>{title}</h4>
          <button type="button" className="zl-icon-btn" onClick={onClose} aria-label="×">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        </header>
        <div className="zl-dialog-body">{children}</div>
      </div>
    </div>
  );
}

/** Edits a local draft; nothing reaches the server until the host presses Save. Guests see live values read-only. */
function GroupSettings({ onSaved }: { onSaved: () => void }) {
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.sessionId);
  const t = useT();
  const isHost = room.hostId === me;
  const live = { turns: room.tasksPerPlayer, timeMin: room.nightMin, cops: room.cops, isPublic: room.isPublic };
  const [draft, setDraft] = useState(live);
  const { turns, timeMin, cops, isPublic } = isHost ? draft : live;
  const edit = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = turns !== room.tasksPerPlayer || timeMin !== room.nightMin || cops !== room.cops || isPublic !== room.isPublic;
  const n = room.players.length;
  // cops must stay below half the civilians: 3 * cops < players
  const copsOk = copsValid(cops, Math.max(n, MIN_PLAYERS));
  const save = () => {
    const msg: { tasksPerPlayer?: number; timeMin?: number; cops?: number } = {};
    if (turns !== room.tasksPerPlayer) msg.tasksPerPlayer = turns;
    if (timeMin !== room.nightMin) msg.timeMin = timeMin;
    if (cops !== room.cops) msg.cops = cops;
    if (Object.keys(msg).length) send('configure', msg);
    if (isPublic !== room.isPublic) send('host:visibility', { public: isPublic });
    onSaved();
  };
  return (
    <div className="zl-pane">
      {!isHost && <p className="zl-note">{t('hostOnly')}</p>}
      <section className="zl-card">
        <ZlSlider label={t('tasksPer')} min={GAME.tasksPerPlayerMin} max={GAME.tasksPerPlayerMax} value={turns} disabled={!isHost} onChange={(v) => edit({ turns: v })} />
        <ZlSlider
          label={t('nightLen')}
          unit={t('minutesShort')}
          min={import.meta.env.DEV ? GAME.timeMinMinDev : GAME.timeMinMin}
          max={GAME.timeMinMax}
          value={timeMin}
          disabled={!isHost}
          onChange={(v) => edit({ timeMin: v })}
        />
        <ZlSlider label={t('copsCount')} min={GAME.copsMin} max={GAME.copsMax} value={cops} disabled={!isHost} onChange={(v) => edit({ cops: v })} />
        {!copsOk && <p className="zl-note">{t('copsTooMany').replace('{max}', String(maxCops(Math.max(n, MIN_PLAYERS)))).replace('{n}', String(Math.max(n, MIN_PLAYERS)))}</p>}
        <div className="zl-setting">
          <span className="zl-setting-label">{t('roomVisibility')}</span>
          <div className="zl-seg" role="radiogroup" aria-label={t('roomVisibility')}>
            {[false, true].map((pub) => (
              <button key={String(pub)} type="button" role="radio" aria-checked={isPublic === pub} disabled={!isHost} onClick={() => edit({ isPublic: pub })}>
                {pub ? `🌐 ${t('roomPublic')}` : `🔒 ${t('roomPrivate')}`}
              </button>
            ))}
          </div>
        </div>
      </section>
      {isHost && (
        <button type="button" className="zl-btn primary zl-save" disabled={!dirty || !copsOk} onClick={save}>
          {t('save')}
        </button>
      )}
    </div>
  );
}

function ZlSlider(props: { label: string; min: number; max: number; value: number; unit?: string; disabled?: boolean; onChange: (v: number) => void }) {
  const { min, max, value } = props;
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 100;
  return (
    <label className={`zl-setting ${props.disabled ? 'is-disabled' : ''}`}>
      <span className="zl-setting-label">
        {props.label}
        <b>
          {value}
          {props.unit && ` ${props.unit}`}
        </b>
      </span>
      <input
        type="range"
        className="zl-range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={props.disabled || max === min}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}
