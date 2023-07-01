import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, './src/assets'),
      '@classes': path.resolve(__dirname, './src/classes'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
});
