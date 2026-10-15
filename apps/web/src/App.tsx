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
        {phase === 'ended' && end && <EndScreen />}
        <TaskModal />
        <IntroModal />
        <Cinematic />
      </div>
      <Toasts />
      <RotateGate />
    </div>
  );
}

/** Phones play landscape only: in portrait (CSS-gated) everything else is hidden behind this card. */
function RotateGate() {
  const t = useT();
  return (
    <div className="rotate-gate" role="alert">
      <img src={asset('common/ui/mobile/rotate-phone.webp')} alt="" draggable={false} />
      <h2>{t('rotateTitle')}</h2>
      <p>{t('rotateBody')}</p>
    </div>
  );
}
