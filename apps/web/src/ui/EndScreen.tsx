import { ROLE_INFO } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { colorHex, useStore } from '../store';
import { RoleBadge } from './common';

export function EndScreen() {
  const end = useStore((s) => s.end);
  const room = useStore((s) => s.room);
  const sessionId = useStore((s) => s.sessionId);
  if (!end || !room) return null;
  const isHost = room.hostId === sessionId;
  return (
    <div className="end-screen">
      <div className="end-card">
        <h1 className={end.winner}>{end.winner === 'crew' ? 'Người Dân thắng!' : 'Hắc Ảnh thắng!'}</h1>
        <p>{end.reason}</p>

        <section>
          <h3>Vai trò</h3>
          <div className="role-list">
            {end.roles.map((r, i) => (
              <div key={i} className={`role-row ${r.faction}`}>
                <RoleBadge role={r.role} size={36} />
                <b style={{ color: colorHex(r.color) }}>{r.name}</b>
                <span>
                  {ROLE_INFO[r.role].name}
                  {!r.alive && ' ☠'}
                </span>
                <em className="tag">{r.tasksDone} nhiệm vụ</em>
              </div>
            ))}
          </div>
        </section>

        <section className="learned">
          <h3>Bạn có biết về Huế?</h3>
          <p>{end.fact}</p>
        </section>

        <div className="end-actions">
          {isHost ? (
            <button className="btn primary" onClick={() => send('host:restart', {})}>
              Về sảnh — chơi ván mới
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
