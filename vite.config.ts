import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Derlemedeki bütün dosyaları service worker'ın ön önbellek listesine yazar. */
function precache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'kervan-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const list = ['./', ...files.filter((f) => f !== 'sw.js' && f !== 'index.html').sort()];
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace("'__PRECACHE__'", JSON.stringify(list.map((f) => (f === './' ? f : `./${f}`))));
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: './',
  server: { port: 5190 },
  // Phaser tek başına ~1.2 MB; uyarı gürültüsünü kapat
  build: { chunkSizeWarningLimit: 1600 },
  plugins: [precache()],
});
