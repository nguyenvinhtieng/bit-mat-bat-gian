import { useState } from 'react';
import { DEVIATION_TYPES, HUE_NPCS, HUE_PANEL_SENTENCES, HUE_WHEN_OPTIONS, type ConclusionVote } from '@hidden-truth/shared';
import { send } from '../net';
import { colorHex, useStore } from '../store';
import { Chat } from './Chat';
import { ClueCard, Icon, fmt, useCountdown } from './common';

export function Meeting() {
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.me);
  const sessionId = useStore((s) => s.sessionId);
  const left = useCountdown(room.phaseEndsAt);
  const isHost = room.hostId === sessionId;
  const conclusion = room.phase === 'conclusion';
  const shared = new Set(room.board.map((b) => b.id));

  return (
    <div className="meeting">
      <header className="meeting-head">
        <Icon name={conclusion ? 'vote' : 'meeting-table'} size={44} />
        <div>
          <h2>{conclusion ? 'Bỏ phiếu kết luận' : room.finalMeeting ? 'Cuộc họp cuối trước giờ mở cửa' : `Họp — vòng ${room.round}`}</h2>
          <span>{room.meetingReason}</span>
        </div>
        <div className="meeting-timer">
          <Icon name="timer" size={24} /> {fmt(left)}
        </div>
        {isHost && (
          <button className="btn small" onClick={() => send('host:skip', {})}>
            {conclusion ? 'Chốt kết quả' : 'Kết thúc họp'}
          </button>
        )}
      </header>

      <div className="meeting-grid">
        <section className="meeting-players">
          <h4>Người chơi</h4>
          <ul className="player-list">
            {room.players.map((p) => (
              <li key={p.id} className={p.connected ? '' : 'off'}>
                <i className="dot" style={{ background: colorHex(p.color) }} />
                {p.name}
                <em className="tag">{p.tasksDone} task</em>
                {conclusion && p.voted && <em className="tag ok">đã bỏ phiếu</em>}
              </li>
            ))}
          </ul>
          <div className="board-count">
            Manh mối trên bảng: <b>{room.board.length}</b> {room.board.length < 3 ? '(cần ≥ 3 để kết luận hợp lệ)' : '✓'}
          </div>
        </section>

        <section className="meeting-center">
          {conclusion && <ConclusionForm />}
          <Chat />
        </section>

        <section className="meeting-board">
          <h4>Bảng manh mối chung</h4>
          {room.board.length === 0 && <p className="muted">Chưa có manh mối nào được chia sẻ.</p>}
          {room.board.map((c) => (
            <ClueCard key={c.id} clue={c} by={c.by} />
          ))}
          {me && me.notebook.length > 0 && (
            <>
              <h4>Sổ của tôi</h4>
              {me.notebook.map((c) => (
                <ClueCard
                  key={c.id}
                  clue={c}
                  actions={
                    shared.has(c.id) ? (
                      <span className="tag ok">đã trên bảng</span>
                    ) : (
                      <button className="btn small primary" onClick={() => send('clue:share', { clueId: c.id })}>
                        Đưa lên bảng
                      </button>
                    )
                  }
                />
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ConclusionForm() {
  const me = useStore((s) => s.room?.players.find((p) => p.id === s.sessionId));
  const [v, setV] = useState<Partial<ConclusionVote>>({});
  const complete = v.sentence && v.type && v.responsible && v.when;
  if (me?.voted) return <div className="conclusion done">Đã gửi kết luận. Chờ những người khác…</div>;
  return (
    <div className="conclusion">
      <p className="muted small">Kết luận của nhóm = lựa chọn được nhiều phiếu nhất cho từng mục. Hoà phiếu tính là chưa thống nhất.</p>
      <label className="field">
        Câu nào trên bảng song ngữ lệch hồ sơ?
        <select value={v.sentence ?? ''} onChange={(e) => setV({ ...v, sentence: Number(e.target.value) })}>
          <option value="">—</option>
          {HUE_PANEL_SENTENCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Loại sai lệch
        <select value={v.type ?? ''} onChange={(e) => setV({ ...v, type: e.target.value as ConclusionVote['type'] })}>
          <option value="">—</option>
          {DEVIATION_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Người chịu trách nhiệm chính
        <select value={v.responsible ?? ''} onChange={(e) => setV({ ...v, responsible: e.target.value })}>
          <option value="">—</option>
          {HUE_NPCS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name} — {n.role}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Câu lệch xuất hiện lần đầu khi nào?
        <select value={v.when ?? ''} onChange={(e) => setV({ ...v, when: e.target.value })}>
          <option value="">—</option>
          {HUE_WHEN_OPTIONS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
      <button className="btn primary" disabled={!complete} onClick={() => send('conclude', v as ConclusionVote)}>
        Gửi kết luận
      </button>
    </div>
  );
}
