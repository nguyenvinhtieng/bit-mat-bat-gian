import { AREA_RECTS, HUE_AREAS, HUE_MAP_PREVIEW, HUE_STATIONS, LAYOUT_H, LAYOUT_W, MEETING_POINT, TILE, type AreaId } from '@hidden-truth/shared';
import { useLang } from '../i18n';
import { useStore } from '../store';
import { EscHint, asset, useEscape } from './common';

/** Label anchor per room (tile units) — kept off the furniture. */
const LABEL_AT: Partial<Record<AreaId, [number, number]>> = {
  courtyard_checkin: [21, 6.45],
  exhibition: [7.5, 16.6],
  coordination: [34.5, 16.6],
  editing: [21, 23.9],
  archive: [11.5, 26.6],
  artifact_storage: [30.5, 30.3],
};

/**
 * Full-screen map: the painted overview of the palace with room plaques, my pending tasks
 * (numbered, pulsing), finished ones, the Ngũ Phụng bell and my live position.
 */
export function MapView({ current, pos, onClose }: { current: AreaId | ''; pos: { x: number; y: number } | null; onClose: () => void }) {
  useEscape(onClose);
  const me = useStore((s) => s.me);
  const lang = useLang((s) => s.lang);
  const en = lang === 'en';
  const tasks = (me?.tasks ?? []).map((id, i) => ({ st: HUE_STATIONS.find((x) => x.id === id)!, n: i + 1, done: !!me?.completedTasks.includes(id) }));
  const name = (id: AreaId) => (en ? HUE_AREAS[id].nameEn : HUE_AREAS[id].name);
  const tx = (v: number) => v / TILE;

  return (
    <div className="mapview" onClick={onClose}>
      <div className="mapview-card" onClick={(e) => e.stopPropagation()}>
        <header className="mapview-head">
          <span className="mapview-orn" aria-hidden />
          <div>
            <h2>{en ? 'Imperial City of Huế' : 'Hoàng Thành Huế'}</h2>
            <small>{en ? 'The night of the Calendar Ceremony' : 'Đêm Ban Sóc · bản đồ Kinh thành'}</small>
          </div>
          <span className="mapview-orn r" aria-hidden />
          <button className="mapview-close" onClick={onClose} aria-label="Close">
            <EscHint />✕
          </button>
        </header>

        <div className="mapview-body">
          <div className="mapview-stage">
            <img className="mapview-img" src={asset(`${HUE_MAP_PREVIEW}.webp`)} alt="" draggable={false} />
            <svg className="mapview-svg" viewBox={`0 0 ${LAYOUT_W} ${LAYOUT_H}`} preserveAspectRatio="none">
              <defs>
                <radialGradient id="mv-glow">
                  <stop offset="0" stopColor="#ffe48a" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* current room outline */}
              {current &&
                AREA_RECTS[current].map(([x, y, w, h], i) => (
                  <rect key={i} className="mv-cur" x={x + 0.08} y={y + 0.08} width={w - 0.16} height={h - 0.16} rx={0.3} />
                ))}
              {/* bell */}
              <g className="mv-bell" transform={`translate(${tx(MEETING_POINT.x)} ${tx(MEETING_POINT.y) - 0.6})`}>
                <circle r={0.75} />
                <image href={asset('common/ui/meeting-bell.webp')} x={-0.6} y={-0.6} width={1.2} height={1.2} />
              </g>
              {tasks.map(({ st, n, done }) => (
                <g key={st.id} className={`mv-task ${done ? 'done' : 'todo'}`} transform={`translate(${tx(st.x)} ${tx(st.y)})`}>
                  {!done && <circle className="mv-halo" r={1.6} fill="url(#mv-glow)" />}
                  <circle className="mv-pin" r={0.62} />
                  <text className="mv-num" dy="0.05">
                    {done ? '✓' : n}
                  </text>
                </g>
              ))}
              {pos && (
                <g className="mv-me" transform={`translate(${pos.x} ${pos.y})`}>
                  <circle className="mv-me-pulse" r={1.4} />
                  <circle className="mv-me-dot" r={0.5} />
                  <text className="mv-me-label" y={-0.95}>
                    {en ? 'You' : 'Bạn'}
                  </text>
                </g>
              )}
            </svg>
            {(Object.keys(LABEL_AT) as AreaId[]).map((id) => {
              const [x, y] = LABEL_AT[id]!;
              return (
                <span key={id} className={`mv-plaque ${id === current ? 'cur' : ''}`} style={{ left: `${(x / LAYOUT_W) * 100}%`, top: `${(y / LAYOUT_H) * 100}%` }}>
                  {name(id)}
                </span>
              );
            })}
            <svg className="mv-compass" viewBox="-20 -20 40 40" aria-hidden>
              <circle r="17" />
              <path d="M0 -16 L4 0 L0 16 L-4 0Z" className="ns" />
              <path d="M-16 0 L0 3 L16 0 L0 -3Z" className="ew" />
              <text y="-10.5">{en ? 'N' : 'B'}</text>
            </svg>
          </div>

          <aside className="mapview-legend">
            <h4>{en ? 'Your tasks' : 'Nhiệm vụ của bạn'}</h4>
            <ol>
              {tasks.map(({ st, n, done }) => (
                <li key={st.id} className={`${done ? 'done' : ''} ${st.area === current && !done ? 'here' : ''}`}>
                  <b>{done ? '✓' : n}</b>
                  <span>
                    {en ? st.titleEn : st.title}
                    <small>{name(st.area)}</small>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mv-keys">
              <span>
                <i className="k-me" /> {en ? 'You are here' : 'Vị trí của bạn'}
              </span>
              <span>
                <i className="k-todo" /> {en ? 'Task to do' : 'Nhiệm vụ cần làm'}
              </span>
              <span>
                <i className="k-bell" /> {en ? 'Ngũ Phụng bell (emergency)' : 'Chuông Ngũ Phụng (họp khẩn)'}
              </span>
            </div>
            <p className="mv-hint">
              <kbd>M</kbd> / <kbd>Esc</kbd> {en ? 'to close' : 'để đóng'}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
