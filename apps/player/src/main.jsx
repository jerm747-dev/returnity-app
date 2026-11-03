import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { PlayerProvider } from './player.jsx';
import { loadData } from './data.js';
import './styles.css';

loadData().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <PlayerProvider><App /></PlayerProvider>
    </StrictMode>,
  );
});
