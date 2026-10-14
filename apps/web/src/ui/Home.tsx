import { useEffect, useState } from 'react';
import { createRoom, joinRoom, reconnect } from '../net';
import { useStore } from '../store';
import { asset } from './common';

const NAME_KEY = 'tht:name';

export function Home() {
  const { connecting, error } = useStore();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const joinMatch = /^\/join\/([A-Za-z0-9]{4,8})/.exec(location.pathname);
  const [code, setCode] = useState(joinMatch?.[1]?.toUpperCase() ?? '');

  useEffect(() => {
    reconnect();
  }, []);

  const saveName = () => {
    const n = name.trim().slice(0, 16);
    localStorage.setItem(NAME_KEY, n);
    return n;
  };

  return (
    <div className="home" style={{ backgroundImage: `url(${asset('maps/co-do-hue/meta/hue-loading.webp')})` }}>
      <div className="home-card">
        <h1>
          The Hidden Truth
          <small>Bí Ẩn Việt Nam</small>
        </h1>
        <p className="tagline">Hồ Sơ Việt Nam · suy luận xã hội · điều tra bằng bằng chứng</p>

        <label className="field">
          Tên hiển thị
          <input value={name} maxLength={16} placeholder="Ví dụ: Minh" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="map-card">
          <img src={asset('maps/co-do-hue/meta/hue-lobby-thumb.webp')} alt="Cố đô Huế" />
          <div>
            <img src={asset('maps/co-do-hue/meta/hue-map-icon.webp')} width={40} height={40} alt="" />
            <strong>Map: Cố đô Huế</strong>
            <span>Một câu trên bảng song ngữ lệch hồ sơ nghiên cứu — dịch, biên tập hay in vội?</span>
          </div>
        </div>

        <div className="home-actions">
          <button className="btn primary" disabled={connecting} onClick={() => createRoom(saveName())}>
            Tạo phòng mới
          </button>
          <div className="join-row">
            <input
              className="code-input"
              value={code}
              maxLength={8}
              placeholder="MÃ PHÒNG"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && code && joinRoom(code, saveName())}
            />
            <button className="btn" disabled={connecting || code.length < 4} onClick={() => joinRoom(code, saveName())}>
              Vào phòng
            </button>
          </div>
        </div>
        {connecting && <p className="muted">Đang kết nối…</p>}
        {error && <p className="error">{error}</p>}
        <p className="muted small">Điều khiển: WASD / phím mũi tên để đi · E hoặc Space để tương tác.</p>
      </div>
    </div>
  );
}
