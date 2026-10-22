import { useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS, mapSkin } from '@hidden-truth/shared';
import { send } from '../net';
import type { VoteResult } from '@hidden-truth/shared';
import { colorHex, KILLER_NAME_COLOR, useKillerIds, useStore, type PlayerView } from '../store';
import { SockReveal } from './SockReveal';
import { Avatar, ChatLines, colorIndex, Composer, GROUP_NAME, groupAvatar } from './Zola';
import { Digits, fmt, useCountdown } from './common';

/** gap between the kick message and the full-screen sock check (reveal phase is only GAME.revealSec long) */
const EJECT_DELAY_MS = 1100;

/** Overlapping mini avatars of who picked an option (ballots are public). */
function VoterStack({ list }: { list: PlayerView[] }) {
  if (!list.length) return null;
  return (
    <span className="zl-stack">
      {list.slice(0, 5).map((v) => (
        <span key={v.id} title={v.name}>
          <Avatar color={colorIndex(v.color)} size={22} />
        </span>
      ))}
      {list.length > 5 && <em>+{list.length - 5}</em>}
    </span>
  );
}

function Poll({
  question,
  options,
  myId,
  canVote,
  myVote,
  votersOf,
  castN,
  aliveN,
  onDone,
}: {
  question: string;
  options: PlayerView[];
  myId: string;
  canVote: boolean;
  myVote: string;
  votersOf: (target: string) => PlayerView[];
  castN: number;
  aliveN: number;
  onDone?: () => void;
}) {
  const [pick, setPick] = useState('');
  const chosen = myVote || pick;
  const submit = () => {
    if (!pick) return;
    send('vote', { target: pick });
    onDone?.();
  };
  const row = (id: string, label: React.ReactNode, ava: React.ReactNode, disabled: boolean) => {
    const voters = votersOf(id);
    const pct = castN ? Math.round((voters.length / castN) * 100) : 0;
    return (
      <li key={id}>
        <label className={`zl-opt ${chosen === id ? 'on' : ''} ${disabled ? 'off' : ''}`}>
          <input type="radio" name="zl-poll" checked={chosen === id} disabled={disabled} onChange={() => setPick(id)} />
          <span className="zl-check" aria-hidden />
          <span className="zl-opt-bar" style={{ width: `${pct}%` }} aria-hidden />
          {ava}
          <span className="zl-opt-label">{label}</span>
          <VoterStack list={voters} />
          <b className="zl-opt-n">{voters.length}</b>
        </label>
      </li>
    );
  };
  return (
    <div className="zl-poll">
      <div className="zl-poll-head">
        <PollIcon />
        <div>
          <strong>{question}</strong>
          <small>Chọn 1 người · Phiếu công khai · {castN}/{aliveN} đã bình chọn</small>
        </div>
      </div>
      <ul className="zl-opts">
        {options.map((p) =>
          row(
            p.id,
            <>
              {p.name}
              {p.id === myId && <i> (bạn)</i>}
            </>,
            <Avatar color={colorIndex(p.color)} size={28} />,
            !canVote || p.id === myId,
          ),
        )}
        {row('skip', 'Không chọn ai', <span className="zl-ava zl-ava-skip" style={{ width: 28, height: 28 }}>—</span>, !canVote)}
      </ul>
      {canVote ? (
        <button className="zl-btn primary" disabled={!pick} onClick={submit}>
          Bình chọn
        </button>
      ) : (
        <p className="zl-poll-note">{myVote ? 'Bạn đã bình chọn — chờ mọi người…' : 'Bạn chỉ có thể xem bình chọn.'}</p>
      )}
    </div>
  );
}

function PollIcon() {
  return (
    <svg className="zl-poll-ico" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

function Messages({ myId, players, top, tail }: { myId: string; players: PlayerView[]; top: React.ReactNode; tail?: React.ReactNode }) {
  const chat = useStore((s) => s.chat);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.length, !!tail]);
  return (
    <div className="zl-msgs" ref={list} role="log" aria-label="Tin nhắn nhóm" aria-relevant="additions text">
      <div className="zl-sys">Cuộc họp bắt đầu · nhóm đã tạo một bình chọn</div>
      <div className="zl-row zl-poll-msg">{top}</div>
      <ChatLines myId={myId} players={players} />
      {tail}
    </div>
  );
}

/** Zola-style closing lines for the poll: the result card, then who got removed from the group. */
function ResultMessages({ result, question, killerNames }: { result: VoteResult; question: string; killerNames: Set<string> }) {
  const total = result.tally.reduce((s, x) => s + x.votes, result.skips) || 1;
  const rows = [...result.tally.map((t) => ({ key: t.name, name: t.name, color: t.color, n: t.votes })), { key: '~skip', name: 'Không chọn ai', color: -1, n: result.skips }];
  return (
    <>
      <div className="zl-sys">Bình chọn đã kết thúc</div>
      <div className="zl-row zl-poll-msg">
        <div className="zl-poll zl-tally">
          <div className="zl-poll-head">
            <PollIcon />
            <div>
              <strong>{question}</strong>
              <small>Kết quả bình chọn</small>
            </div>
          </div>
          <ul className="zl-opts">
            {rows.map((t) => (
              <li key={t.key}>
                <span className={`zl-opt off ${t.name === result.ejected ? 'on' : ''}`}>
                  <span className="zl-opt-bar" style={{ width: `${Math.round((t.n / total) * 100)}%` }} aria-hidden />
                  {t.color >= 0 ? <Avatar color={t.color} size={28} /> : <span className="zl-ava zl-ava-skip" style={{ width: 28, height: 28 }}>—</span>}
                  <span className="zl-opt-label" style={killerNames.has(t.name) ? { color: KILLER_NAME_COLOR } : undefined}>
                    {t.name}
                  </span>
                  <b className="zl-opt-n">{t.n}</b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {result.ejected ? (
        <div className="zl-sys zl-kick">
          {result.ejectedColor != null && <Avatar color={result.ejectedColor} size={18} />}
          <span>
            <b>{result.ejected}</b> đã bị mời ra khỏi nhóm
          </span>
        </div>
      ) : (
        <div className="zl-sys zl-kick">Không ai bị mời ra khỏi nhóm</div>
      )}
    </>
  );
}

function Members({ players, myId, killerIds, onClose }: { players: PlayerView[]; myId: string; killerIds: readonly string[]; onClose?: () => void }) {
  const sorted = [...players].sort((a, b) => Number(b.alive) - Number(a.alive));
  return (
    <aside className="zl-side">
      <header>
        <strong>Thành viên ({players.length})</strong>
        {onClose && (
          <button className="zl-icon-btn zl-side-x" onClick={onClose} aria-label="Đóng danh sách">
            <svg viewBox="0 0 24 24" aria-hidden><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        )}
      </header>
      <ul>
        {sorted.map((p) => {
          const status = !p.alive ? 'Bị tạm giữ' : !p.connected ? 'Mất kết nối' : p.voted ? 'Đã bình chọn' : 'Chưa bình chọn';
          const cls = !p.alive ? 'held' : !p.connected ? 'off' : p.voted ? 'done' : 'wait';
          return (
            <li key={p.id} className={cls}>
              <Avatar color={colorIndex(p.color)} size={38} dim={!p.alive || !p.connected} />
              <span className="zl-mem">
                <b style={killerIds.includes(p.id) ? { color: KILLER_NAME_COLOR } : undefined}>
                  {p.name}
                  {p.id === myId && <i> (bạn)</i>}
                </b>
                <small>{status}</small>
              </span>
              {p.alive && p.voted && (
                <svg className="zl-tick" viewBox="0 0 24 24" aria-label="Đã bình chọn">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m7.5 12.5 3 3 6-6.5" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function Meeting() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const result = useStore((s) => s.voteResult);
  const skin = mapSkin(room.mapSlug);
  const socks = skin.ejectScene === 'socks';
  const left = useCountdown(room.phaseEndsAt);
  const isHost = room.hostId === sessionId;
  const reveal = room.phase === 'reveal';
  const mine = room.players.find((p) => p.id === sessionId);
  const killerIds = useKillerIds();
  const killerNames = new Set(room.players.filter((p) => killerIds.includes(p.id)).map((p) => p.name));
  const canVote = room.phase === 'meeting' && !!mine?.alive && !mine.voted;
  const [pollOpen, setPollOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  // the "kicked from the group" line lands in the chat first, then the sock check takes over the screen
  const [showEject, setShowEject] = useState(false);
  useEffect(() => {
    setShowEject(false);
    if (!reveal || !result?.ejected) return;
    const t = setTimeout(() => setShowEject(true), EJECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [reveal, result?.ejected]);
  const alive = room.players.filter((p) => p.alive && p.connected);
  const votedN = alive.filter((p) => p.voted).length;
  const votersOf = (target: string) => room.players.filter((v) => v.alive && v.voteFor === target);
  const question = `Ai là ${skin.killerName.vi}?`;
  const options = room.players.filter((p) => p.alive);
  const urgent = left != null && left <= 10;
  const poll = (onDone?: () => void) => (
    <Poll
      question={question}
      options={options}
      myId={sessionId}
      canVote={canVote}
      myVote={mine?.voteFor ?? ''}
      votersOf={votersOf}
      castN={votedN}
      aliveN={alive.length}
      onDone={onDone}
    />
  );

  return (
    <div className="meeting zola">
      <div className={`zl-app ${membersOpen ? 'members-open' : ''}`}>
        <section className="zl-main">
          <header className="zl-head">
            <img className="zl-group-ava" src={groupAvatar} alt="" />
            <div className="zl-head-title">
              <strong>{GROUP_NAME}</strong>
              <small>
                {room.players.length} thành viên · {room.meetingReason || skin.labels.meetingPlace.vi}
              </small>
            </div>
            <span className={`zl-timer ${urgent ? 'urgent' : ''}`} title="Thời gian còn lại">
              <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
              <Digits text={fmt(left)} />
            </span>
            {isHost && reveal && (
              <button className="zl-btn ghost" onClick={() => send('host:skip', {})}>
                Bỏ qua
              </button>
            )}
            <button className="zl-icon-btn zl-members-btn" onClick={() => setMembersOpen((v) => !v)} aria-label="Thành viên" title="Thành viên">
              <svg viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.8a3.4 3.4 0 0 1 0 6.4M18 13.8c2 .6 3.2 2.4 3.5 5.2" /></svg>
            </button>
          </header>

          {!reveal && (
            <button className="zl-pin" onClick={() => setPollOpen(true)}>
              <PollIcon />
              <span className="zl-pin-text">
                <small>Bình chọn · đã ghim</small>
                <b>{question}</b>
              </span>
              <span className="zl-pin-count">
                {votedN}/{alive.length}
              </span>
              <span className="zl-btn primary small">{canVote ? 'Bình chọn' : 'Xem'}</span>
            </button>
          )}

          <Messages myId={sessionId} players={room.players} top={poll()} tail={reveal && result ? <ResultMessages result={result} question={question} killerNames={killerNames} /> : null} />
          <Composer enabled={!!mine?.alive && room.phase === 'meeting'} lockedHint={!mine?.alive ? 'Bạn đang bị tạm giữ — chỉ được xem' : 'Bình chọn đã kết thúc'} />
        </section>

        <Members players={room.players} myId={sessionId} killerIds={killerIds} onClose={() => setMembersOpen(false)} />
      </div>

      {reveal && result?.ejected && showEject && (
        <div className={`zl-eject vote-result ${socks ? 'socks' : ''}`}>
          {socks ? (
            <>
              <h1 className="eject-line">
                Kéo ống quần <span style={{ color: colorHex(PLAYER_COLORS[result.ejectedColor ?? 0] ?? 0xffffff) }}>{result.ejected}</span> lên coi tất…
              </h1>
              <SockReveal key={result.ejected} name={result.ejected} color={result.ejectedColor ?? 0} wasKiller={!!result.wasKiller} />
              <p className={`eject-verdict ${result.wasKiller ? 'good' : 'bad'}`}>
                {(result.wasKiller ? skin.phrases?.ejectKiller : skin.phrases?.ejectInnocent)?.vi.replace('{name}', result.ejected) ??
                  `${result.ejected} ${result.wasKiller ? `CHÍNH LÀ ${skin.killerName.vi}!` : `KHÔNG phải là ${skin.killerName.vi}…`}`}
              </p>
            </>
          ) : (
            <>
              <Avatar color={result.ejectedColor ?? 0} size={96} />
              <p className={`eject-verdict ${result.wasKiller ? 'good' : 'bad'}`}>
                {result.ejected} {result.wasKiller ? `CHÍNH LÀ ${skin.killerName.vi}!` : `KHÔNG phải là ${skin.killerName.vi}…`}
              </p>
            </>
          )}
          <p className="muted">{result.killersLeft > 0 ? `Vẫn còn ${result.killersLeft} ${skin.killerName.vi} trong nhóm.` : `Không còn ${skin.killerName.vi} nào!`}</p>
        </div>
      )}

      {pollOpen && !reveal && (
        <div className="zl-modal-bg" onClick={() => setPollOpen(false)}>
          <div className="zl-modal" role="dialog" aria-label="Bình chọn" onClick={(e) => e.stopPropagation()}>
            <header>
              <strong>Bình chọn</strong>
              <button className="zl-icon-btn" onClick={() => setPollOpen(false)} aria-label="Đóng">
                <svg viewBox="0 0 24 24" aria-hidden><path d="m7 7 10 10M17 7 7 17" /></svg>
              </button>
            </header>
            {poll(() => setPollOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}
