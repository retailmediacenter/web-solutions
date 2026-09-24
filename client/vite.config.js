import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/web-solutions/' : '/',
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000', '/legacy': 'http://127.0.0.1:3000' }
  }
}));
