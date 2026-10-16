import { useEffect, useState } from 'react';
import { httpBase } from '../net';

type RoomStat = {
  code: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  public: boolean;
  phase: string;
  map: string;
  creator: string;
  createdAt: number;
};
type Stats = { online: number; roomCount: number; rooms: RoomStat[] };

const POLL_MS = 3000;

const age = (t: number) => {
  if (!t) return '—';
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60}m`;
};

/** /admin — read-only server stats over HTTP; never joins a room, so the viewer isn't counted as a player */
export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${httpBase()}/admin/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Stats;
        if (!alive) return;
        setStats(data);
        setError('');
        setUpdated(Date.now());
      } catch (e) {
        if (alive) setError(String((e as Error).message ?? e));
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const rooms = [...(stats?.rooms ?? [])].sort((a, b) => b.clients - a.clients);

  return (
    <div className="admin">
      <h1>Admin · Thống kê</h1>
      <div className="admin-tiles">
        <div className="admin-tile">
          <div className="admin-num">{stats?.online ?? '—'}</div>
          <div className="muted">Người chơi online</div>
        </div>
        <div className="admin-tile">
          <div className="admin-num">{stats?.roomCount ?? '—'}</div>
          <div className="muted">Phòng đang mở</div>
        </div>
      </div>
      <div className="muted small">
        {error ? <span className="error">Lỗi: {error}</span> : updated ? `Cập nhật ${new Date(updated).toLocaleTimeString()} · tự làm mới mỗi ${POLL_MS / 1000}s` : 'Đang tải…'}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã phòng</th>
              <th>Người chơi</th>
              <th>Trạng thái</th>
              <th>Loại</th>
              <th>Map</th>
              <th>Chủ phòng</th>
              <th>Đã mở</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">Không có phòng nào</td>
              </tr>
            ) : (
              rooms.map((r) => (
                <tr key={r.code}>
                  <td className="admin-code">{r.code}</td>
                  <td>{r.clients}/{r.maxClients}</td>
                  <td>{r.phase || '—'}{r.locked ? ' 🔒' : ''}</td>
                  <td>{r.public ? 'Công khai' : 'Riêng tư'}</td>
                  <td>{r.map || '—'}</td>
                  <td>{r.creator || '—'}</td>
                  <td>{age(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
