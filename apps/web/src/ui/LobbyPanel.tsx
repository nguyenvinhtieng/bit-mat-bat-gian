import { MIN_RECOMMENDED_PLAYERS } from '@hidden-truth/shared';
import { leaveRoom, send } from '../net';
import { colorHex, useStore } from '../store';
import { asset } from './common';
import { Chat } from './Chat';

export function LobbyPanel() {
  const room = useStore((s) => s.room)!;
  const sessionId = useStore((s) => s.sessionId);
  const toast = useStore((s) => s.toast);
  const isHost = room.hostId === sessionId;
  const me = room.players.find((p) => p.id === sessionId);
  const link = `${location.origin}/join/${room.code}`;

  return (
    <aside className="lobby-panel">
      <div className="room-code">
        <span>Mã phòng</span>
        <strong>{room.code}</strong>
        <button
          className="btn small"
          onClick={() => {
            navigator.clipboard?.writeText(link);
            toast({ text: 'Đã copy link mời!', kind: 'success' });
          }}
        >
          Copy link mời
        </button>
      </div>
      <div className="map-mini">
        <img src={asset('maps/co-do-hue/meta/hue-lobby-thumb.webp')} alt="" />
        <span>Cố đô Huế — “Mật mã cố đô”</span>
      </div>

      <h4>
        Người chơi ({room.players.length}/10)
      </h4>
      <ul className="player-list">
        {room.players.map((p) => (
          <li key={p.id}>
            <i className="dot" style={{ background: colorHex(p.color) }} />
            {p.name}
            {p.id === room.hostId && <em className="tag">host</em>}
            {p.ready && <em className="tag ok">sẵn sàng</em>}
          </li>
        ))}
      </ul>
      {room.players.length < MIN_RECOMMENDED_PLAYERS && (
        <p className="muted small">Gợi ý 4–10 người. Có thể bắt đầu với ít người để chơi thử (không có / ít phe Bí Mật).</p>
      )}

      <div className="lobby-actions">
        <button className={`btn ${me?.ready ? '' : 'primary'}`} onClick={() => send('ready', { ready: !me?.ready })}>
          {me?.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng'}
        </button>
        <button className="btn ghost" onClick={leaveRoom}>
          Rời phòng
        </button>
      </div>

      {isHost && (
        <div className="host-box">
          <h4>Host</h4>
          <label className="field">
            Biến thể vụ án
            <select value={room.variantChoice} onChange={(e) => send('configure', { variant: e.target.value as 'random' })}>
              <option value="random">Ngẫu nhiên (khuyên dùng — không lộ đáp án)</option>
              <option value="HUE-A">HUE-A</option>
              <option value="HUE-B">HUE-B</option>
              <option value="HUE-C">HUE-C</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={room.quick} onChange={(e) => send('configure', { variant: room.variantChoice as 'random', quick: e.target.checked })} />
            Chế độ nhanh (vòng ngắn hơn)
          </label>
          <button className="btn primary wide" onClick={() => send('start', {})}>
            Bắt đầu ván ({room.players.filter((p) => p.ready).length}/{room.players.length} sẵn sàng)
          </button>
        </div>
      )}
      <Chat compact />
    </aside>
  );
}
