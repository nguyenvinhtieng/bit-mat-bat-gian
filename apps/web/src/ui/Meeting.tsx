import { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '@hidden-truth/shared';
import { send } from '../net';
import { colorHex, useStore, type PlayerView } from '../store';
import { Chat } from './Chat';
import { Sprite } from './Cinematic';
import { asset, fmt, useCountdown, useEscape } from './common';

const mt = (n: string) => asset(`common/ui/meeting/${n}.webp`);
/** RoomView players carry the hex colour; the sprite renderer wants the palette index. */
const colorIndex = (hex: number) => Math.max(0, PLAYER_COLORS.indexOf(hex));

function TimerRing({ left, total }: { left: number | null; total: number }) {
  const pct = left == null ? 0 : Math.max(0, Math.min(1, left / Math.max(1, total)));
  const urgent = left != null && left <= 10;
  return (
    <div className={`meet-timer ${urgent ? 'urgent' : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="trk" cx="50" cy="50" r="44" />
        <circle className="arc" cx="50" cy="50" r="44" pathLength="100" style={{ strokeDashoffset: 100 - pct * 100 }} />
      </svg>
      <span>{fmt(left)}</span>
    </div>
  );
}

function VoteCard({
  p,
  me,
  canVote,
  selected,
  onSelect,
}: {
  p: PlayerView;
  me: boolean;
  canVote: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const votable = canVote && p.alive && !me;
  const cls = ['vcard', p.alive ? '' : 'dead', p.connected ? '' : 'off', me ? 'me' : '', votable ? 'votable' : '', selected ? 'sel' : ''].join(' ');
  return (
    <li className={cls}>
      <button className="vcard-hit" disabled={!votable} onClick={onSelect} title={me ? 'Bạn không thể bỏ phiếu cho chính mình' : undefined}>
        <span className="vcard-portrait" style={{ '--pc': colorHex(p.color) } as React.CSSProperties}>
          <Sprite color={colorIndex(p.color)} dir="down" scale={1.5} />
          {!p.alive && <img className="vcard-skull" src={asset('common/ui/body-marker.webp')} alt="" />}
        </span>
        <span className="vcard-info">
          <span className="vcard-name">
            {p.name}
            {me && <em className="vcard-you">Bạn</em>}
          </span>
          <span className="vcard-sub">{!p.alive ? 'Đã bị hạ gục' : !p.connected ? 'Mất kết nối' : me ? 'Không thể tự bỏ phiếu' : votable ? 'Chọn để bỏ phiếu loại' : ' '}</span>
        </span>
        {p.alive && p.voted && <img className="vcard-stamp" src={mt('stamp-voted')} alt="đã bỏ phiếu" title="Đã bỏ phiếu" />}
      </button>
      {selected && (
        <div className="vcard-confirm">
          <button className="vc-yes" onClick={() => send('vote', { target: p.id })}>
            <img src={mt('seal-eject')} alt="" /> Loại {p.name}
          </button>
          <button className="vc-no" onClick={onSelect} aria-label="Huỷ">
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

export function Meeting() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const result = useStore((s) => s.voteResult);
  const left = useCountdown(room.phaseEndsAt);
  const isHost = room.hostId === sessionId;
  const reveal = room.phase === 'reveal';
  const mine = room.players.find((p) => p.id === sessionId);
  const canVote = room.phase === 'meeting' && !!mine?.alive && !mine.voted;
  const [sel, setSel] = useState<string | null>(null);
  const [total, setTotal] = useState(75);
  useEffect(() => {
    if (left != null && left > total) setTotal(left);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!canVote) setSel(null);
  }, [canVote]);
  useEscape(() => setSel(null), !!sel);
  const alive = room.players.filter((p) => p.alive && p.connected);
  const votedN = alive.filter((p) => p.voted).length;
  const emergency = /chuông|khẩn/i.test(room.meetingReason);

  return (
    <div className={`meeting v2 ${reveal ? 'is-reveal' : ''}`} style={{ backgroundImage: `url(${mt('meeting-bg')})` }}>
      <img className="meet-lantern l" src={mt('den-cung-dinh')} alt="" aria-hidden />
      <img className="meet-lantern r" src={mt('den-cung-dinh')} alt="" aria-hidden />
      <header className="meet-head">
        <img className="meet-bell" src={mt('chuong-ngu-phung')} alt="" />
        <div className="meet-title">
          <span className="meet-eyebrow">{reveal ? 'Phán quyết của đoàn' : emergency ? 'Chuông Ngũ Phụng vang lên' : 'Phát hiện thi thể'}</span>
          <h2>{reveal ? 'Kết quả bỏ phiếu' : 'Họp khẩn trước Điện Thái Hòa'}</h2>
          <span className="meet-reason">{room.meetingReason}</span>
        </div>
        <TimerRing left={left} total={reveal ? 6 : total} />
        {isHost && (
          <button className="btn small meet-skip-host" onClick={() => send('host:skip', {})}>
            {reveal ? 'Bỏ qua' : 'Chốt phiếu'}
          </button>
        )}
      </header>

      {reveal && result ? (
        <div className="vote-result v2">
          {result.ejected ? (
            <>
              <div className="eject-sky">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.3}s` }} />
                ))}
                <div className="eject-fly">
                  <Sprite color={result.ejectedColor ?? 0} dir="down" scale={3} />
                </div>
              </div>
              <h1 className="eject-line">
                <span style={{ color: colorHex(PLAYER_COLORS[result.ejectedColor ?? 0] ?? 0xffffff) }}>{result.ejected}</span> bị trục xuất khỏi Kinh thành.
              </h1>
              <p className={`eject-verdict ${result.wasKiller ? 'good' : 'bad'}`}>{result.ejected} {result.wasKiller ? 'CHÍNH LÀ Âm Binh!' : 'KHÔNG phải là Âm Binh…'}</p>
            </>
          ) : (
            <>
              <img className="noeject-seal" src={mt('seal-skip')} alt="" />
              <h1 className="eject-line">Không ai bị loại.</h1>
            </>
          )}
          <p className="muted">{result.killersLeft > 0 ? `Vẫn còn ${result.killersLeft} Âm Binh trong đoàn.` : 'Không còn Âm Binh nào!'}</p>
          <ul className="tally v2">
            {result.tally.map((t) => (
              <li key={t.name}>
                <i className="dot" style={{ background: colorHex(PLAYER_COLORS[t.color] ?? 0xffffff) }} />
                <span>{t.name}</span>
                <b className="tally-seals">
                  {Array.from({ length: t.votes }, (_, i) => (
                    <img key={i} src={mt('seal-eject')} alt="" style={{ animationDelay: `${2.2 + i * 0.15}s` }} />
                  ))}
                </b>
              </li>
            ))}
            <li>
              <i className="dot skip" />
              <span>Bỏ qua</span>
              <b className="tally-seals">
                {Array.from({ length: result.skips }, (_, i) => (
                  <img key={i} src={mt('seal-skip')} alt="" style={{ animationDelay: `${2.2 + i * 0.15}s` }} />
                ))}
              </b>
            </li>
          </ul>
        </div>
      ) : (
        <div className="meet-grid">
          <section className="meet-board">
            <div className="meet-board-head">
              <h4>{canVote ? 'Bỏ phiếu loại ai?' : mine?.alive ? 'Bạn đã bỏ phiếu' : 'Người chơi'}</h4>
              <span className="meet-count">
                <img src={mt('stamp-voted')} alt="" /> {votedN}/{alive.length} đã bỏ phiếu
              </span>
            </div>
            <ul className="vcards">
              {room.players.map((p) => (
                <VoteCard key={p.id} p={p} me={p.id === sessionId} canVote={canVote} selected={sel === p.id} onSelect={() => setSel(sel === p.id ? null : p.id)} />
              ))}
            </ul>
            <div className="meet-actions">
              {canVote && (
                <button className="skip-vote" onClick={() => send('vote', { target: 'skip' })}>
                  <img src={mt('seal-skip')} alt="" /> Bỏ qua — không loại ai
                </button>
              )}
              {mine?.alive && mine.voted && <p className="muted">Phiếu của bạn đã được niêm phong. Chờ những người khác…</p>}
              {!mine?.alive && <p className="muted">Bạn là hồn ma — chỉ xem, không thể nói hoặc bỏ phiếu.</p>}
            </div>
          </section>

          <section className="meet-chat">
            <Chat />
          </section>
        </div>
      )}
    </div>
  );
}
