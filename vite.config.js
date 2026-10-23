import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// BUILD=design → build trang Design Sheet; mặc định build game.
const B = process.env.BUILD;
const page = B === 'design' ? 'design.html' : B === 'characters' ? 'characters.html' : 'index.html';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: B === 'design' ? 'dist-design' : B === 'characters' ? 'dist-characters' : 'dist',
    rollupOptions: { input: page },
  },
});
