import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5190 },
  // Phaser tek başına ~1.2 MB; uyarı gürültüsünü kapat
  build: { chunkSizeWarningLimit: 1600 },
});
