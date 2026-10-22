import { PhaserGame } from './game/PhaserGame';
import { useStore } from './store';
import { Home } from './ui/Home';
import { Hud } from './ui/Hud';
import { LobbyPanel } from './ui/LobbyPanel';
import { TaskModal } from './ui/TaskModal';
import { IntroModal } from './ui/Panels';
import { Meeting } from './ui/Meeting';
import { EndScreen } from './ui/EndScreen';
import { Cinematic } from './ui/Cinematic';
import { Toasts, asset } from './ui/common';
import { Joystick } from './ui/Joystick';
import { DevPanel } from './ui/DevPanel';
import { useT } from './i18n';

export function App() {
  const screen = useStore((s) => s.screen);
  const phase = useStore((s) => s.room?.phase);
  const mapSlug = useStore((s) => s.room?.mapSlug);
  const end = useStore((s) => s.end);

  if (screen === 'home' || !phase)
    return (
      <>
        <Home />
        <Toasts />
        <RotateGate />
      </>
    );

  return (
    <div className="game-root">
      <PhaserGame key={mapSlug} />
      <div className="ui-layer">
        {/* first, so every other control sits above the touch-stick zone */}
        {(phase === 'lobby' || phase === 'explore') && <Joystick />}
        <Hud />
        {phase === 'lobby' && <LobbyPanel />}
        {(phase === 'meeting' || phase === 'reveal') && <Meeting />}
        {/* stays up in the lobby too, until I leave it — someone else may have gone back first */}
        {(phase === 'ended' || phase === 'lobby') && end && <EndScreen />}
        <TaskModal />
        <IntroModal />
        <Cinematic />
      </div>
      <PingBadge />
      {import.meta.env.DEV && <DevPanel />}
      <ReconnectBanner />
      <Toasts />
      <RotateGate />
    </div>
  );
}

/** always-on round-trip time in the bottom corner; tiny and click-through so it never gets in the way */
function PingBadge() {
  const ping = useStore((s) => s.ping);
  const tone = !ping ? '' : ping < 100 ? 'good' : ping < 250 ? 'ok' : 'bad';
  return (
    <div className={`ping-badge ${tone}`} aria-hidden>
      <i />
      {ping ? `${ping} ms` : '— ms'}
    </div>
  );
}

/** shown while net.recover() retries after an unexpected drop; the stale room stays on screen behind it */
function ReconnectBanner() {
  const t = useT();
  const on = useStore((s) => s.reconnecting);
  if (!on) return null;
  return (
    <div className="reconnect-banner" role="status" aria-live="polite">
      <i className="spinner" aria-hidden />
      {t('reconnecting')}
    </div>
  );
}

/** Phones play landscape only: in portrait (CSS-gated) everything else is hidden behind this card. */
function RotateGate() {
  const t = useT();
  return (
    <div className="rotate-gate" role="alert">
      <img src={asset('maps/common/ui/mobile/rotate-phone.webp')} alt="" draggable={false} />
      <h2>{t('rotateTitle')}</h2>
      <p>{t('rotateBody')}</p>
    </div>
  );
}
