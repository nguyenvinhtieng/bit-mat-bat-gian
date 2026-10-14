import { DEVIATION_TYPES, HUE_NPCS, HUE_PANEL_SENTENCES, HUE_WHEN_OPTIONS, ROLE_INFO } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { useStore } from '../store';
import { RoleBadge } from './common';

const mark = (ok: boolean) => (ok ? '✅' : '❌');

export function EndScreen() {
  const end = useStore((s) => s.end);
  const room = useStore((s) => s.room);
  const sessionId = useStore((s) => s.sessionId);
  if (!end || !room) return null;
  const isHost = room.hostId === sessionId;
  const t = end.teamConclusion;
  const label = {
    sentence: HUE_PANEL_SENTENCES.find((s) => s.id === t?.sentence)?.label ?? 'chưa thống nhất',
    type: DEVIATION_TYPES.find((d) => d.id === t?.type)?.label ?? 'chưa thống nhất',
    responsible: HUE_NPCS.find((n) => n.id === t?.responsible)?.name ?? 'chưa thống nhất',
    when: HUE_WHEN_OPTIONS.find((w) => w.id === t?.when)?.label ?? 'chưa thống nhất',
  };
  return (
    <div className="end-screen">
      <div className="end-card">
        <h1 className={end.winner}>{end.winner === 'investigation' ? 'Phe Điều Tra thắng' : 'Phe Bí Mật thắng'}</h1>
        <p className="muted">Biến thể: {end.variantId}</p>

        <section>
          <h3>Kết luận của nhóm</h3>
          <ul className="verdict">
            <li>{mark(end.correct.sentence)} Câu lệch: {label.sentence}</li>
            <li>{mark(end.correct.type)} Loại sai lệch: {label.type}</li>
            <li>{mark(end.correct.responsible)} Người chịu trách nhiệm chính: {label.responsible}</li>
            <li>{mark(end.correct.when)} Thời điểm: {label.when}</li>
            <li>{mark(end.correct.evidence)} Manh mối trên bảng: {end.sharedClueCount} (cần ≥ 3)</li>
          </ul>
        </section>

        <section>
          <h3>Sự thật của vụ này</h3>
          <p>{end.truthSummary}</p>
          <ol className="steps">
            {end.truthSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3>Vai trò</h3>
          <div className="role-list">
            {end.roles.map((r, i) => (
              <div key={i} className={`role-row ${r.faction}`}>
                <RoleBadge role={r.role} size={36} />
                <b>{r.name}</b>
                <span>{ROLE_INFO[r.role].name}</span>
                {r.faction === 'secret' && <em className={`tag ${r.objectiveMet ? 'ok' : ''}`}>{r.objectiveMet ? 'đạt mục tiêu riêng' : 'không đạt mục tiêu'}</em>}
              </div>
            ))}
          </div>
        </section>

        <section className="learned">
          <h3>Điều bạn hiểu thêm về Huế</h3>
          <p>{end.learned}</p>
          <h3>Câu hỏi còn bỏ ngỏ — Hồ Sơ Bị Khuyết</h3>
          <p className="meta-q">“{end.metaQuestion}”</p>
        </section>

        <div className="end-actions">
          {isHost ? (
            <button className="btn primary" onClick={() => send('host:restart', {})}>
              Về sảnh — chơi biến thể khác
            </button>
          ) : (
            <span className="muted">Chờ host mở ván mới…</span>
          )}
          <button className="btn ghost" onClick={leaveRoom}>
            Rời phòng
          </button>
        </div>
      </div>
    </div>
  );
}
