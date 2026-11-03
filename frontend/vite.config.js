import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Forward API calls to the Spring Boot backend so the app and API share one address, as in production
    proxy: { '/api': 'http://localhost:8080' },
  },
  preview: { port: 3000 },
  build: { outDir: 'build' },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    restoreMocks: true,
  },
});
