import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Relative base so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), about: resolve(import.meta.dirname, 'about.html'), dashboard: resolve(import.meta.dirname, 'dashboard.html') },
    },
  },
});
