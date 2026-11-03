import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Arcade from './Arcade.jsx';
import { MusicProvider } from './music.jsx';
import { loadConfig } from './config.js';
import './arcade.css';

loadConfig().then(() => {
  createRoot(document.getElementById('root')).render(<StrictMode><MusicProvider><Arcade /></MusicProvider></StrictMode>);
});
