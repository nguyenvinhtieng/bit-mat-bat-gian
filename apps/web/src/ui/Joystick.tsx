import { useRef, useState } from 'react';

/** Virtual joystick for touch devices — writes to window.__joy, read by GameScene. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  if (!('ontouchstart' in window)) return null;
  const w = window as unknown as { __joy?: { dx: number; dy: number } };
  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    const len = Math.min(40, Math.hypot(x, y));
    const a = Math.atan2(y, x);
    setKnob({ x: Math.cos(a) * len, y: Math.sin(a) * len });
    const dz = 12;
    w.__joy = { dx: Math.abs(x) > dz ? Math.sign(x) : 0, dy: Math.abs(y) > dz ? Math.sign(y) : 0 };
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    w.__joy = { dx: 0, dy: 0 };
  };
  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
