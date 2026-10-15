import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { useStore } from './store';
import * as net from './net';
import { AssetGate } from './ui/Preloader';
import { MobileShell } from './ui/MobileShell';
import { registerAssetWorker } from './preload';

// dev-only hooks for automated visual checks (tools/smoke)
if (import.meta.env.DEV) Object.assign(window, { __store: useStore, __net: net });

registerAssetWorker();

createRoot(document.getElementById('root')!).render(
  <>
    <AssetGate>
      <App />
    </AssetGate>
    <MobileShell />
  </>,
);
