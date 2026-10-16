import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development, /api requests are proxied to the backend so cookies stay same-origin.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
