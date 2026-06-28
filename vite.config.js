import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
  server: {
    proxy: {
      '/ws-room': {
        target: 'ws://localhost:3001',
        ws: true,
        rewrite: () => '/',
      },
    },
  },
});
