import { PLAYER_COLORS, ROLE_INFO } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { colorHex, useStore } from '../store';
import { RoleBadge, asset } from './common';

export function EndScreen() {
  const end = useStore((s) => s.end);
  const room = useStore((s) => s.room);
  const sessionId = useStore((s) => s.sessionId);
  if (!end || !room) return null;
  const isHost = room.hostId === sessionId;
  return (
    // the world dims first, then the winning faction's emblem + ribbon rise, then the details
    <div className={`end-screen ${end.winner}`}>
      <div className="end-card">
        <div className="end-hero">
          <div className="end-rays" aria-hidden />
          <img className="end-emblem" src={asset(`common/ui/end/victory-${end.winner}.webp`)} alt="" draggable={false} />
          <div className="end-ribbon">
            <h1 className={end.winner}>{end.winner === 'crew' ? 'Người Dân thắng!' : 'Âm Binh thắng!'}</h1>
          </div>
          <p className="end-reason">{end.reason}</p>
        </div>

        <section>
          <h3>Vai trò</h3>
          <div className="role-list">
            {/* Âm Binh first so the reveal is the first thing everyone reads */}
            {[...end.roles].sort((a, b) => Number(b.faction === 'killer') - Number(a.faction === 'killer')).map((r, i) => (
              <div key={i} className={`role-row ${r.faction} ${r.alive ? '' : 'dead'}`}>
                <RoleBadge role={r.role} size={40} />
                <div className="role-row-main">
                  <b style={{ color: colorHex(PLAYER_COLORS[r.color] ?? 0xffffff) }}>{r.name}</b>
                  <span className="role-row-role">
                    {ROLE_INFO[r.role].name}
                    {!r.alive && ' ☠'}
                  </span>
                </div>
                {r.faction === 'killer' ? <em className="tag killer-tag">Kẻ gian</em> : <em className="tag">{r.tasksDone} nhiệm vụ</em>}
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
