import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built site works from any folder or domain.
// The kit's shared/ folder (cover art) sits outside this app; server.fs lets the dev server read it.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['../..'] } },
});
