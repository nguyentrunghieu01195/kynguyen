import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// BUILD=design → build trang Design Sheet; mặc định build game.
const page = process.env.BUILD === 'design' ? 'design.html' : 'index.html';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: process.env.BUILD === 'design' ? 'dist-design' : 'dist',
    rollupOptions: { input: page },
  },
});
