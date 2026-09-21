import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = process.env.API_URL || 'http://localhost:3000';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': api, '/uploads': api, '/i': api },
  },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
});
