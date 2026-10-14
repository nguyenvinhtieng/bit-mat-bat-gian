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
import { Toasts } from './ui/common';
import { Joystick } from './ui/Joystick';

export function App() {
  const screen = useStore((s) => s.screen);
  const phase = useStore((s) => s.room?.phase);
  const end = useStore((s) => s.end);

  if (screen === 'home' || !phase)
    return (
      <>
        <Home />
        <Toasts />
      </>
    );

  return (
    <div className="game-root">
      <PhaserGame />
      <div className="ui-layer">
        <Hud />
        {phase === 'lobby' && <LobbyPanel />}
        {(phase === 'meeting' || phase === 'reveal') && <Meeting />}
        {phase === 'ended' && end && <EndScreen />}
        <TaskModal />
        <IntroModal />
        <Cinematic />
        {(phase === 'lobby' || phase === 'explore') && <Joystick />}
      </div>
      <Toasts />
    </div>
  );
}
