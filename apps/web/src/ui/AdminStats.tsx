import { useEffect, useState } from 'react';
import { mapMeta, type Phase } from '@giao-keo/shared';
import { httpBase } from '../net';

type RoomStat = {
  code: string;
  clients: number;
  online: number;
  maxClients: number;
  locked: boolean;
  public: boolean;
  phase: string;
  map: string;
  creator: string;
  createdAt: number;
};
type Stats = { online: number; roomCount: number; rooms: RoomStat[] };
type Filter = 'all' | 'lobby' | 'playing';

const POLL_MS = 3000;
const TOKEN_KEY = 'tht:adminToken';

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

/** DELETE an empty room; on a missing/wrong admin token asks for it once and retries */
async function deleteRoom(code: string, retry = true): Promise<string | null> {
  const res = await fetch(`${httpBase()}/admin/rooms/${code}`, { method: 'DELETE', headers: { 'x-admin-token': readToken() } });
  if (res.ok) return null;
  const msg = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`;
  if (res.status === 401 && retry) {
    const token = prompt('Nhập mã quản trị (ADMIN_TOKEN):');
    if (!token) return msg;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
    return deleteRoom(code, false);
  }
  return msg;
}

const PHASE: Record<Phase, string> = { lobby: 'Phòng chờ', explore: 'Đang chơi', meeting: 'Đang họp', reveal: 'Công bố', ended: 'Kết thúc' };
const phaseLabel = (p: string) => PHASE[p as Phase] ?? (p || '—');

const age = (t: number) => {
  if (!t) return '—';
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? 'vừa mở' : m < 60 ? `${m} phút` : `${Math.floor(m / 60)}h${m % 60}p`;
};

/** /admin — read-only server stats over HTTP; never joins a room, so the viewer isn't counted as a player */
export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [removing, setRemoving] = useState('');
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);

  const remove = async (code: string) => {
    if (!confirm(`Xoá phòng ${code}? Phòng không còn ai online và sẽ bị đóng ngay.`)) return;
    setRemoving(code);
    const err = await deleteRoom(code).catch((e) => String((e as Error).message ?? e));
    setRemoving('');
    setNotice(err ? { text: `Không xoá được ${code}: ${err}`, bad: true } : { text: `Đã xoá phòng ${code}` });
    if (!err) setStats((s) => s && { ...s, roomCount: s.roomCount - 1, rooms: s.rooms.filter((r) => r.code !== code) });
  };

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

  const all = [...(stats?.rooms ?? [])].sort((a, b) => b.online - a.online || b.clients - a.clients);
  const lobby = all.filter((r) => r.phase === 'lobby');
  const playing = all.filter((r) => r.phase !== 'lobby');
  const rooms = filter === 'lobby' ? lobby : filter === 'playing' ? playing : all;
  const tiles = [
    { label: 'Người chơi online', value: stats?.online, tone: 'gold' },
    { label: 'Phòng đang mở', value: stats?.roomCount, tone: 'paper' },
    { label: 'Đang chơi', value: stats && playing.length, tone: 'crimson' },
    { label: 'Phòng chờ', value: stats && lobby.length, tone: 'jade' },
  ];

  return (
    <div className="admin">
      <header className="admin-head">
        <div>
          <h1>Bảng điều khiển</h1>
          <p className="muted small">Giao Kèo · thống kê máy chủ</p>
        </div>
        <div className={`admin-live ${error ? 'down' : ''}`}>
          <i aria-hidden />
          {error ? `Mất kết nối · ${error}` : updated ? `Live · ${new Date(updated).toLocaleTimeString()}` : 'Đang tải…'}
        </div>
      </header>

      <div className="admin-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`admin-tile tone-${t.tone}`}>
            <div className="admin-num">{t.value ?? '—'}</div>
            <div className="admin-label">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-bar">
        <h2>Danh sách phòng</h2>
        <div className="admin-filters" role="tablist">
          {(
            [
              ['all', 'Tất cả', all.length],
              ['lobby', 'Phòng chờ', lobby.length],
              ['playing', 'Đang chơi', playing.length],
            ] as const
          ).map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} <span>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={`admin-notice ${notice.bad ? 'bad' : ''}`} role="status">
          {notice.text}
          <button onClick={() => setNotice(null)} aria-label="Đóng">
            ✕
          </button>
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="admin-empty">Không có phòng nào</div>
      ) : (
        <div className="admin-rooms">
          {rooms.map((r) => {
            const offline = r.clients - r.online;
            return (
              <article key={r.code} className={`admin-room phase-${r.phase || 'none'}`}>
                <div className="admin-room-top">
                  <span className="admin-code">{r.code}</span>
                  <span className="admin-badge phase">{phaseLabel(r.phase)}</span>
                  <span className={`admin-badge ${r.public ? 'pub' : 'priv'}`}>{r.public ? 'Công khai' : 'Riêng tư'}</span>
                  {r.locked && <span className="admin-badge lock">Khoá</span>}
                </div>
                <div className="admin-fill">
                  <div className="admin-fill-track">
                    <span style={{ width: `${(r.online / r.maxClients) * 100}%` }} />
                    <span className="off" style={{ width: `${(offline / r.maxClients) * 100}%` }} />
                  </div>
                  <b>
                    {r.online}/{r.maxClients}
                  </b>
                </div>
                {offline > 0 && <div className="admin-warn">{offline} người đang mất kết nối</div>}
                {r.online === 0 && (
                  <div className="admin-empty-room">
                    <span>Không còn ai online</span>
                    <button className="admin-del" disabled={removing === r.code} onClick={() => remove(r.code)}>
                      {removing === r.code ? 'Đang xoá…' : 'Xoá phòng'}
                    </button>
                  </div>
                )}
                <dl className="admin-meta">
                  <div>
                    <dt>Map</dt>
                    <dd title={r.map ? mapMeta(r.map).name.vi : undefined}>{r.map ? mapMeta(r.map).name.vi : '—'}</dd>
                  </div>
                  <div>
                    <dt>Người tạo</dt>
                    <dd title={r.creator || undefined}>{r.creator || '—'}</dd>
                  </div>
                  <div>
                    <dt>Đã mở</dt>
                    <dd>{age(r.createdAt)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
