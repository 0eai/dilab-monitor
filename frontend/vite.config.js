import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5173,
    proxy: {
      // REST API (HTTP only)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Metrics WebSocket
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true
      },
      // Terminal WebSocket — explicit WS proxy with its own entry
      '/ws-terminal': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ws-terminal/, '/api/terminal')
      }
    }
  }
});