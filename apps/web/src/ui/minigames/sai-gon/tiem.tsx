/** Tiệm vá xe & cây xăng mini: đổ xăng tròn 50, vá vỏ xe. The server judges every answer. */
import { useEffect, useRef, useState } from 'react';
import type { TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useShake, type Submit } from '../common/kit';
import { useT, vnd } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== Đổ xăng tròn 50
export function DoXang({ task, submit }: { task: T<'task_do_xang'>; submit: Submit }) {
  const t = useT();
  const [held, setHeld] = useState(0);
  const heldRef = useRef(0);
  const [on, setOn] = useState(false);
  const [phase, setPhase] = useState<'pump' | 'done'>('pump');
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const raf = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => (cancelAnimationFrame(raf.current), clearTimeout(timer.current)), []);

  const perMs = (task.litersPerSec * task.pricePerLiter) / 1000;
  const money = held * perMs;
  const liters = (held / 1000) * task.litersPerSec;

  const press = () => {
    if (phase !== 'pump' || on) return;
    setMsg('');
    setOn(true);
    let last = performance.now();
    let tick = 0;
    const loop = (now: number) => {
      heldRef.current += now - last;
      last = now;
      setHeld(heldRef.current);
      if (now - tick > 120) (tick = now), sfx.scrape();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const release = () => {
    if (!on) return;
    cancelAnimationFrame(raf.current);
    setOn(false);
    const m = heldRef.current * perMs;
    if (m > task.target + task.tolerance) {
      sfx.bad();
      doShake();
      heldRef.current = 0;
      setHeld(0);
      return setMsg(t(`Lố ${vnd(m - task.target)} rồi! Khách càm ràm — đổ lại từ đầu nhé.`, `${vnd(m - task.target)} over! Start again.`));
    }
    if (m < task.target - task.tolerance) return setMsg(t(`Còn thiếu ${vnd(task.target - m)} — nhích thêm chút.`, `${vnd(task.target - m)} short — top it up.`));
    sfx.ok();
    setPhase('done');
    timer.current = window.setTimeout(() => submit({ holdMs: Math.round(heldRef.current) }), 900);
  };

  const fill = Math.min(1, money / task.target);
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      vars={{ target: vnd(task.target) }}
      status={vnd(task.pricePerLiter) + '/L'}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={phase === 'done' ? t('Tròn trịa 50 nghìn — khách gật gù “được đó”.', 'Bang on 50k — the customer nods.') : msg || t('Nhấn giữ cò bơm, thả tay đúng lúc.', 'Hold the trigger, let go at the right moment.')}
    >
      <div className="sg-dx">
        <svg className={`sg-dx-pump ${shake}`} viewBox="0 0 240 200" aria-hidden>
          {/* the mini pump: a red cabinet with a two-line LCD */}
          <rect x="20" y="10" width="110" height="180" rx="10" fill="#c62828" stroke="#7f1414" strokeWidth="2" />
          <rect x="20" y="10" width="110" height="26" rx="10" fill="#e53935" />
          <text x="75" y="28" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff6d6" letterSpacing="1">
            XĂNG RON 95
          </text>
          <rect x="32" y="46" width="86" height="64" rx="4" fill="#0f1a12" stroke="#3a4a3e" strokeWidth="2" />
          <text x="112" y="70" textAnchor="end" fontSize="17" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fill={money > task.target + task.tolerance ? '#ff6b5b' : '#8dff8a'}>
            {Math.floor(money).toLocaleString('vi-VN')}
          </text>
          <text x="38" y="62" fontSize="8" fill="#8dff8a" opacity="0.6">
            đ
          </text>
          <text x="112" y="98" textAnchor="end" fontSize="13" fontFamily="ui-monospace, Menlo, monospace" fill="#ffd27a">
            {liters.toFixed(2)}
          </text>
          <text x="38" y="94" fontSize="8" fill="#ffd27a" opacity="0.6">
            L
          </text>
          {/* fill gauge toward the target */}
          <rect x="32" y="122" width="86" height="12" rx="6" fill="#4a0f0f" />
          <rect x="32" y="122" width={86 * fill} height="12" rx="6" fill={fill >= 1 ? '#ffd27a' : '#ffab40'} />
          <rect x="32" y="146" width="86" height="34" rx="4" fill="#9a1d1d" />
          <path d="M130 120 Q160 120 170 150 Q178 176 196 172" fill="none" stroke="#1d1d1f" strokeWidth="6" strokeLinecap="round" />
          {/* nozzle into the scooter tank */}
          <g className={on ? 'sg-dx-nozzle on' : 'sg-dx-nozzle'}>
            <path d="M188 160 L214 160 L222 176 L206 182 L200 172 L188 172Z" fill="#2b2b2e" stroke="#000" strokeWidth="1" />
            <path d="M214 166 L232 172" stroke="#9aa3aa" strokeWidth="4" strokeLinecap="round" />
          </g>
          {on && <path className="sg-dx-flow" d="M232 172 L236 196" stroke="#f9d36b" strokeWidth="3" strokeLinecap="round" />}
        </svg>
        <button
          className={`btn primary tl-big ${on ? 'sg-hold' : ''}`}
          disabled={phase !== 'pump'}
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
        >
          {t('Giữ cò bơm', 'Hold the trigger')}
        </button>
      </div>
    </MgShell>
  );
}

// ================================================================== Vá vỏ xe
const R = 70; // tube radius, svg units

export function VaVo({ task, submit }: { task: T<'task_va_vo'>; submit: Submit }) {
  const t = useT();
  const n = task.sectors;
  const step = 360 / n;
  /** unbounded turn counter (so the CSS transition never spins the long way round) */
  const [rot, setRot] = useState(0);
  const [patched, setPatched] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const [phase, setPhase] = useState<'find' | 'done'>('find');
  const timer = useRef(0);
  const drag = useRef<{ x: number; r: number } | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const under = ((rot % n) + n) % n; // the sector dipped in the basin
  const bubbling = task.leaks.includes(under) && !patched.includes(under);

  const turn = (d: number) => {
    if (phase !== 'find') return;
    sfx.scrape();
    setMsg('');
    setRot((r) => r + d);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => (e.key === 'ArrowLeft' ? turn(-1) : e.key === 'ArrowRight' ? turn(1) : undefined);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  const patch = () => {
    if (phase !== 'find') return;
    if (!bubbling) {
      sfx.bad();
      doShake();
      return setMsg(patched.includes(under) ? t('Chỗ này vá rồi — xoay tìm lỗ kia.', 'Already patched — find the other hole.') : t('Không thấy sủi bọt — chỗ này lành mà.', 'No bubbles — this bit is fine.'));
    }
    sfx.stamp();
    const next = [...patched, under];
    setPatched(next);
    setMsg('');
    if (next.length === task.leaks.length) {
      setPhase('done');
      timer.current = window.setTimeout(() => (sfx.ok(), submit({ patches: next })), 900);
    }
  };

  // dragging sideways turns the tube one sector per ~28px
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, r: rot };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || phase !== 'find') return;
    const r = drag.current.r + Math.round((e.clientX - drag.current.x) / 28);
    if (r !== rot) sfx.scrape(), setRot(r), setMsg('');
  };
  const onUp = () => void (drag.current = null);

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${patched.length}/${task.leaks.length}`}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : bubbling ? 'ok' : 'info'}
      hint={
        phase === 'done'
          ? t('Vá xong, bơm căng — chạy tiếp cuốc khác!', 'Patched and pumped — back on the road!')
          : msg || (bubbling ? t('Sủi bọt kìa! Bấm Vá ngay.', 'Bubbles! Patch it now.') : t('Kéo ngang hoặc bấm ◀ ▶ để xoay ruột xe qua thau nước.', 'Drag sideways or press ◀ ▶ to turn the tube through the water.'))
      }
    >
      <div className="sg-vv">
        <svg className={`sg-vv-scene ${shake}`} viewBox="-120 -90 240 230" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden>
          <defs>
            <clipPath id="sgvv-water">
              <ellipse cx="0" cy="96" rx="104" ry="34" />
              <rect x="-104" y="96" width="208" height="40" />
            </clipPath>
            <radialGradient id="sgvv-rubber" r="0.6">
              <stop offset="0.82" stopColor="#3a3a3e" />
              <stop offset="1" stopColor="#141416" />
            </radialGradient>
          </defs>
          {/* basin back rim */}
          <ellipse cx="0" cy="62" rx="108" ry="30" fill="#5d7f96" stroke="#3b5566" strokeWidth="3" />
          <ellipse cx="0" cy="66" rx="100" ry="25" fill="#2e6f8f" />
          {/* the tube ring, turned by `rot` */}
          <g style={{ transform: `translateY(-4px) rotate(${-rot * step}deg)`, transition: 'transform 0.18s ease-out' }}>
            <circle r={R} fill="none" stroke="url(#sgvv-rubber)" strokeWidth="18" />
            <circle r={R} fill="none" stroke="#5a5a60" strokeWidth="1.5" strokeDasharray="2 10" opacity="0.6" />
            <rect x="-4" y={-R - 16} width="8" height="12" rx="2" fill="#c8a24a" />
            {Array.from({ length: n }, (_, k) => {
              // sector k sits at the bottom when rot ≡ k
              const a = ((90 + k * step) * Math.PI) / 180;
              const x = Math.cos(a) * R;
              const y = Math.sin(a) * R;
              return patched.includes(k) ? (
                <rect key={k} x={x - 8} y={y - 6} width="16" height="12" rx="3" fill="#1f1f22" stroke="#c46a2a" strokeWidth="1.5" transform={`rotate(${90 + k * step} ${x} ${y})`} />
              ) : (
                <circle key={k} cx={x} cy={y} r="1.6" fill="#77777e" />
              );
            })}
          </g>
          {/* water in front: the bottom of the tube looks submerged */}
          <g clipPath="url(#sgvv-water)">
            <rect x="-110" y="60" width="220" height="80" fill="#3a8fb5" opacity="0.62" />
          </g>
          {bubbling && (
            <g className="sg-vv-bubbles">
              {[-10, 0, 9, -4, 5].map((x, i) => (
                <circle key={i} cx={x} cy={R - 2} r={2 + (i % 3)} fill="none" stroke="#e8fbff" strokeWidth="1.4" style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </g>
          )}
          {/* basin front lip */}
          <path d="M-108 62 Q-104 128 0 132 Q104 128 108 62" fill="none" stroke="#3b5566" strokeWidth="4" />
          <path d="M-14 88 L0 80 L14 88" fill="none" stroke="#ffd27a" strokeWidth="2" opacity="0.7" />
        </svg>
        <div className="sg-row">
          <button className="btn" disabled={phase !== 'find'} onClick={() => turn(-1)} aria-label={t('Xoay trái', 'Turn left')}>
            ◀
          </button>
          <button className="btn primary" disabled={phase !== 'find'} onClick={patch}>
            {t('Vá', 'Patch')}
          </button>
          <button className="btn" disabled={phase !== 'find'} onClick={() => turn(1)} aria-label={t('Xoay phải', 'Turn right')}>
            ▶
          </button>
        </div>
      </div>
    </MgShell>
  );
}
