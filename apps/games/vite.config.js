import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built cabinet works from any folder (the kit puts it in /games/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['../..'] } }, // shared/ (cover art for the music player)
});
