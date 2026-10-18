import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const DATA_DIR = resolve('data');

/** /data — это каталог с JSON в корне репозитория: в dev отдаём как есть, в build копируем в dist/data. */
function dataPlugin() {
  let outDir = 'dist';
  return {
    name: 'tartil-data',
    configResolved(config) { outDir = config.build.outDir; },
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const file = join(DATA_DIR, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(DATA_DIR) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(readFileSync(file));
      });
    },
    closeBundle() {
      if (this.meta?.watchMode) return;
      cpSync(DATA_DIR, resolve(outDir, 'data'), { recursive: true });
    },
  };
}

/** Генерирует dist/sw.js: список файлов оболочки и данных для офлайна + версия по хэшу содержимого. */
function serviceWorkerPlugin() {
  let outDir = 'dist';
  const walk = (dir) =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  return {
    name: 'tartil-sw',
    apply: 'build',
    enforce: 'post',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle: {
      order: 'post',
      handler() {
        const dist = resolve(outDir);
        const files = walk(dist)
          .map((p) => relative(dist, p).split(sep).join('/'))
          .filter((f) => f !== 'sw.js' && f !== 'data/sources.json')
          .sort();
        const hash = createHash('sha256');
        for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
        const version = hash.digest('hex').slice(0, 12);
        const urls = ['./', ...files.map((f) => './' + f)];
        const tpl = readFileSync(resolve('src/sw.template.js'), 'utf8')
          .replaceAll('__VERSION__', () => version)
          .replaceAll('__PRECACHE__', () => JSON.stringify(urls));
        writeFileSync(join(dist, 'sw.js'), tpl);
        console.log(`sw.js: ${urls.length} файлов в предзагрузке, версия ${version}`);
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [dataPlugin(), serviceWorkerPlugin()],
  build: { target: 'es2020', assetsInlineLimit: 0, outDir: process.env.OUT_DIR || 'dist', emptyOutDir: true },
});
