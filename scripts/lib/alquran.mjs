// Доступ к api.alquran.cloud: по одному запросу, с паузой, повторами и кэшем в .cache.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE, readJson, writeJson } from './util.mjs';

export const API = 'https://api.alquran.cloud/v1/surah';
const CACHE_DIR = join(CACHE, 'alquran-cloud');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Возвращает data ответа: { ayahs: [{ text, ... }] }. Бросает ошибку после 6 неудачных попыток. */
export async function getEdition(surah, edition) {
  const url = `${API}/${surah}/${edition}`;
  const file = join(CACHE_DIR, `${surah}_${edition}.json`);
  if (existsSync(file)) return readJson(file);
  let last;
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const data = (await r.json()).data;
        writeJson(file, data);
        await sleep(400);
        return data;
      }
      last = `HTTP ${r.status}`;
      if (r.status === 429) await sleep(+process.env.RATE_WAIT || 5000);
    } catch (e) {
      last = e.cause?.code ?? e.message;
    }
    await sleep((+process.env.BACKOFF || 1500) * 2 ** i);
  }
  throw new Error(`${url} — ${last}`);
}

// Различия только в знаках в конце (alquran.cloud сохраняет завершающую пунктуацию перевода).
const TRAILING = /[\s.,;:!?\-–—]+$/u;
export const stripTrailing = (s) => s.normalize('NFC').replace(TRAILING, '');
