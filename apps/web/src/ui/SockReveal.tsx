import { useId } from 'react';

const GREEN = '#36c24a';
const INNOCENT = ['#f4f2ea', '#2f63d6'];
const INK = '#22100a';
/** fixed dark denim — a player-coloured leg could itself be green/white/blue and spoil the reveal */
const TROUSER = '#2c3446';

/** Sock colour for the vote reveal: green = the cop; a real driver gets white or blue, picked from the name so every client agrees. */
export function sockColor(name: string, wasKiller: boolean) {
  if (wasKiller) return GREEN;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return INNOCENT[h % INNOCENT.length]!;
}

/**
 * MapSkin.ejectScene 'socks' (Sài Gòn): close-up of the ejected player's leg; a hand rolls the trouser hem up in
 * nervous jerks until the sock shows — green socks give the undercover cop away. Timeline in styles.css (.sock-*).
 */
export function SockReveal({ name, wasKiller }: { name: string; wasKiller: boolean }) {
  const id = useId().replace(/:/g, '');
  const sock = sockColor(name, wasKiller);
  return (
    <div className={`sock-stage ${wasKiller ? 'cop' : 'civil'}`}>
      <svg viewBox="0 0 400 260" className="sock-svg" aria-hidden>
        <defs>
          <radialGradient id={`spot${id}`} cx=".5" cy=".55" r=".6">
            <stop offset="0" stopColor="#4a3a2a" />
            <stop offset="1" stopColor="#0a0806" />
          </radialGradient>
          <linearGradient id={`leg${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".35" />
            <stop offset=".45" stopColor="#fff" stopOpacity=".12" />
            <stop offset="1" stopColor="#000" stopOpacity=".45" />
          </linearGradient>
          <pattern id={`rib${id}`} width="6" height="10" patternUnits="userSpaceOnUse">
            <rect width="3" height="10" fill="#000" opacity=".12" />
          </pattern>
        </defs>
        <rect width="400" height="260" fill={`url(#spot${id})`} />
        {/* floor tiles of the ward office */}
        <path d="M0 232 H400 M60 232 L20 260 M160 232 L150 260 M250 232 L262 260 M340 232 L380 260" stroke="#000" strokeOpacity=".4" strokeWidth="2" />
        {/* shin + sock (always drawn; the trouser slides over them) */}
        <rect x="168" y="20" width="64" height="150" fill="#d9a77c" stroke={INK} strokeWidth="4" />
        <g className="sock">
          <path d="M166 110 H234 V206 Q234 214 226 214 H174 Q166 214 166 206 Z" fill={sock} stroke={INK} strokeWidth="4" />
          <rect x="168" y="112" width="64" height="14" fill={`url(#rib${id})`} />
          <rect x="168" y="112" width="64" height="100" fill={`url(#leg${id})`} />
        </g>
        {/* high-top boot: its shaft hides the sock until the hem clears its collar — only the last jerk shows the colour */}
        <path d="M156 146 H244 V204 Q300 204 312 228 Q314 238 302 238 H150 Q140 238 142 224 L156 204 Z" fill="#3a2a22" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <rect x="154" y="142" width="92" height="12" rx="4" fill="#2a1d17" stroke={INK} strokeWidth="4" />
        <path d="M190 160 L214 168 M214 160 L190 168 M190 174 L214 182 M214 174 L190 182 M190 188 L214 196 M214 188 L190 196" stroke="#d8c9a8" strokeWidth="3" strokeLinecap="round" />
        <path d="M166 158 V200" stroke="#fff" strokeOpacity=".14" strokeWidth="5" strokeLinecap="round" />
        <path d="M150 230 H304" stroke="#000" strokeOpacity=".35" strokeWidth="4" />
        {/* trouser leg + rolled hem + the hand pulling it */}
        <g className="sock-hem">
          <path d="M150 -260 H250 V198 Q200 206 150 198 Z" fill={TROUSER} stroke={INK} strokeWidth="4" />
          <path d="M150 -260 H250 V198 Q200 206 150 198 Z" fill={`url(#leg${id})`} />
          <path d="M200 -260 V190" stroke="#000" strokeOpacity=".25" strokeWidth="2" strokeDasharray="6 5" />
          <rect x="146" y="182" width="108" height="22" rx="7" fill={TROUSER} stroke={INK} strokeWidth="4" />
          <rect x="146" y="182" width="108" height="22" rx="7" fill="#000" opacity=".22" />
          <g className="sock-hand">
            <path d="M252 168 Q292 160 316 176 Q330 186 318 200 Q300 212 262 204 Z" fill="#e8b48a" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M250 180 Q238 182 240 192 Q242 200 254 198 M250 190 Q236 194 240 204 Q244 210 256 206" fill="#e8b48a" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M316 176 L360 150 L380 186 L320 202 Z" fill="#2b4a7a" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
      <div className="sock-vignette" />
      <div className="sock-flash" style={{ '--sock': sock } as React.CSSProperties} />
      <span className="sock-tag">{wasKiller ? 'TẤT XANH LÁ!' : sock === INNOCENT[0] ? 'Tất trắng…' : 'Tất xanh dương…'}</span>
    </div>
  );
}
