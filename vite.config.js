import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  publicDir: 'static',
  build: {
    outDir: 'public',
    emptyOutDir: true,
    target: 'chrome120',
    assetsDir: 'assets',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
