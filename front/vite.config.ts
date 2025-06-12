import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './src/__test__'),
      '@assets': resolve(__dirname, './src/assets'),
      '@layouts': resolve(__dirname, './src/layouts'),
      '@locales': resolve(__dirname, './src/locales'),
      '@modules': resolve(__dirname, './src/modules'),
      '@pages': resolve(__dirname, './src/pages'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
});
