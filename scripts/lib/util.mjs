import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE = join(ROOT, '.cache');
export const DATA = join(ROOT, 'data');

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Скачивает npm-пакет нужной версии (npm pack) и распаковывает в .cache/<name>. */
export function fetchNpm(spec) {
  const dir = join(CACHE, spec.replace(/[@/]/g, '_'));
  const pkgDir = join(dir, 'package');
  if (existsSync(pkgDir)) return pkgDir;
  mkdirSync(dir, { recursive: true });
  const out = execFileSync('npm', ['pack', spec, '--silent', '--pack-destination', dir], { encoding: 'utf8' });
  const tgz = out.trim().split('\n').pop();
  execFileSync('tar', ['xzf', join(dir, tgz), '-C', dir]);
  return pkgDir;
}

/** Скачивает файл по HTTPS в .cache (с повтором). */
export async function fetchFile(url, name) {
  const file = join(CACHE, name);
  if (existsSync(file)) return file;
  mkdirSync(dirname(file), { recursive: true });
  let err;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return file;
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw err;
}

export const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
export const writeJson = (f, o, pretty = false) => {
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(o, null, pretty ? 2 : undefined) + '\n');
};
export const pad3 = (n) => String(n).padStart(3, '0');
export { readdirSync, readFileSync, existsSync };
