import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: 'node_modules/.vite-dungeon-preview',
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [vue({ template: { transformAssetUrls: { includeAbsolute: false } } }), tailwindcss()],
  resolve: {
    alias: Object.fromEntries(
      Object.entries({
        '@': 'src',
        '@shared': 'src/shared',
        '@modules': 'src/modules',
        '@components': 'src/components',
        '@pages': 'src/pages',
        '@layouts': 'src/layouts',
        '@services': 'src/services',
      }).map(([key, path]) => [key, fileURLToPath(new URL(`../${path}`, import.meta.url))])
    ),
  },
  server: { host: '127.0.0.1', port: 5193, strictPort: true },
});
