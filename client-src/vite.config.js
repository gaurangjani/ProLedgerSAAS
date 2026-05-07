import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client-src',
  build: {
    outDir: '../client-dist',
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
