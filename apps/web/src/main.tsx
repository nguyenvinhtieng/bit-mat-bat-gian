import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { useStore } from './store';
import * as net from './net';
import { AssetGate } from './ui/Preloader';
import { MobileShell } from './ui/MobileShell';
import { registerAssetWorker } from './preload';
import { AdminStats } from './ui/AdminStats';

// dev-only hooks for automated visual checks (tools/smoke)
if (import.meta.env.DEV) Object.assign(window, { __store: useStore, __net: net });

const root = createRoot(document.getElementById('root')!);

// /admin: stats only — skip asset preload and never touch the game room
if (/^\/admin\/?$/.test(location.pathname)) {
  root.render(<AdminStats />);
} else {
  registerAssetWorker();
  root.render(
    <>
      <AssetGate>
        <App />
      </AssetGate>
      <MobileShell />
    </>,
  );
}
