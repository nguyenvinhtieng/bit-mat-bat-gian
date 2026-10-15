import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { useStore } from './store';
import * as net from './net';

// dev-only hooks for automated visual checks (tools/smoke)
if (import.meta.env.DEV) Object.assign(window, { __store: useStore, __net: net });

createRoot(document.getElementById('root')!).render(<App />);
