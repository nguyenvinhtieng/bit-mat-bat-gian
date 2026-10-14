import { PLAYER_COLORS } from '@hidden-truth/shared';
import { send } from '../net';
import { colorHex, useStore } from '../store';
import { Chat } from './Chat';
import { Sprite } from './Cinematic';
import { Icon, fmt, useCountdown } from './common';

export function Meeting() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const result = useStore((s) => s.voteResult);
  const left = useCountdown(room.phaseEndsAt);
  const isHost = room.hostId === sessionId;
  const reveal = room.phase === 'reveal';
  const mine = room.players.find((p) => p.id === sessionId);
  const canVote = room.phase === 'meeting' && !!mine?.alive && !mine.voted;

  return (
    <div className="meeting">
      <header className="meeting-head">
        <Icon name={reveal ? 'vote' : 'meeting-table'} size={44} />
        <div>
          <h2>{reveal ? 'Kết quả bỏ phiếu' : 'Họp khẩn'}</h2>
          <span>{room.meetingReason}</span>
        </div>
        <div className="meeting-timer">
          <Icon name="timer" size={24} /> {fmt(left)}
        </div>
        {isHost && (
          <button className="btn small" onClick={() => send('host:skip', {})}>
            {reveal ? 'Bỏ qua' : 'Chốt phiếu'}
          </button>
        )}
      </header>

      {reveal && result ? (
        <div className="vote-result">
          {result.ejected ? (
            <>
              <div className="eject-stage">
                <Sprite color={result.ejectedColor ?? 0} dir="right" scale={3} />
              </div>
              <h1>
                <span style={{ color: colorHex(PLAYER_COLORS[result.ejectedColor ?? 0] ?? 0xffffff) }}>{result.ejected}</span> bị loại khỏi đoàn.
              </h1>
              <p className={result.wasKiller ? 'good' : 'bad'}>{result.wasKiller ? 'Họ ĐÃ là Hắc Ảnh!' : 'Họ KHÔNG phải là Hắc Ảnh…'}</p>
            </>
          ) : (
            <h1>Không ai bị loại.</h1>
          )}
          <p className="muted">
            {result.killersLeft > 0 ? `Vẫn còn Hắc Ảnh trong đoàn (${result.killersLeft}).` : 'Không còn Hắc Ảnh nào!'}
          </p>
          <ul className="tally">
            {result.tally.map((t) => (
              <li key={t.name}>
                <i className="dot" style={{ background: colorHex(PLAYER_COLORS[t.color] ?? 0xffffff) }} /> {t.name}: {t.votes} phiếu
              </li>
            ))}
            <li>Bỏ qua: {result.skips}</li>
          </ul>
        </div>
      ) : (
        <div className="meeting-grid">
          <section className="meeting-players">
            <h4>{canVote ? 'Bỏ phiếu loại ai?' : 'Người chơi'}</h4>
            <ul className="vote-list">
              {room.players.map((p) => (
                <li key={p.id} className={`${p.alive ? '' : 'dead'} ${p.connected ? '' : 'off'}`}>
                  <i className="dot" style={{ background: colorHex(p.color) }} />
                  <span className="vname">
                    {p.name}
                    {p.id === sessionId && ' (bạn)'}
                    {!p.alive && ' ☠'}
                  </span>
                  {p.alive && p.voted && <em className="tag ok">đã chọn</em>}
                  {canVote && p.alive && (
                    <button className="btn small" onClick={() => send('vote', { target: p.id })}>
                      Loại
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canVote && (
              <button className="btn ghost wide" onClick={() => send('vote', { target: 'skip' })}>
                Bỏ qua (không loại ai)
              </button>
            )}
            {mine?.alive && mine.voted && <p className="muted">Bạn đã bỏ phiếu. Chờ những người khác…</p>}
            {!mine?.alive && <p className="muted">Bạn là hồn ma — chỉ xem, không thể nói hoặc bỏ phiếu.</p>}
          </section>

          <section className="meeting-center">
            <Chat />
          </section>
        </div>
      )}
    </div>
  );
}
