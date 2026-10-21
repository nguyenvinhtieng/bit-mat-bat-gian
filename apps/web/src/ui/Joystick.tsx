import { useEffect, useRef, useState } from 'react';
import { asset } from './common';

const R = 56; // knob travel radius (px)
const DEAD = 0.15; // fraction of R ignored
const FULL = 0.65; // fraction of R that already means full speed

type Joy = { dx: number; dy: number };
const setJoy = (j: Joy) => ((window as unknown as { __joy?: Joy }).__joy = j);

export const isTouchDevice = () =>
  typeof window !== 'undefined' && ((typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window);

/**
 * Floating analog stick for touch devices (Among Us style): press anywhere in the left-hand zone,
 * the stick appears under the finger and the drag vector sets direction + speed.
 * Writes window.__joy (unit-circle vector, 0.01 steps to match the server), read by GameScene.
 */
export function Joystick() {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);
  useEffect(() => () => void setJoy({ dx: 0, dy: 0 }), []);
  if (!isTouchDevice()) return null;

  const move = (e: React.PointerEvent, o: { x: number; y: number }) => {
    const x = e.clientX - o.x, y = e.clientY - o.y;
    const len = Math.hypot(x, y);
    const k = len > R ? R / len : 1;
    setKnob({ x: x * k, y: y * k });
    const m = Math.max(0, Math.min(1, (len / R - DEAD) / (FULL - DEAD)));
    const r2 = (v: number) => Math.round(v * 100) / 100;
    setJoy(len ? { dx: r2((x / len) * m), dy: r2((y / len) * m) } : { dx: 0, dy: 0 });
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== pid.current) return;
    pid.current = null;
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
    setJoy({ dx: 0, dy: 0 });
  };

  return (
    <div
      className="joy-zone"
      onPointerDown={(e) => {
        if (pid.current != null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const o = { x: e.clientX, y: e.clientY };
        setOrigin(o);
        move(e, o);
      }}
      onPointerMove={(e) => e.pointerId === pid.current && origin && move(e, origin)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className={`joystick ${origin ? 'is-active' : ''}`}
        style={origin ? { left: origin.x, top: origin.y, bottom: 'auto' } : undefined}
        aria-hidden
      >
        <img className="joy-base" src={asset('maps/common/ui/mobile/joy-base.webp')} alt="" draggable={false} />
        <img
          className="joy-knob"
          src={asset('maps/common/ui/mobile/joy-knob.webp')}
          alt=""
          draggable={false}
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
    </div>
  );
}
