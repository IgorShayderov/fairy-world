import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Isolated visual fixture: no account, server state or combat rewards are changed.
// npx vite --config test/battle-3d.vite.config.ts
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5190 },
});
