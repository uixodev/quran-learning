// Офлайн-хранилище аудио (Cache API) и менеджер скачивания по сурам.
//
// Ключ в кэше не зависит от источника: <страница>/audio-cache/<чтец>/<сура>/<аят>.
// Скачивание идёт через fetch (нужен CORS); если сервер его не разрешает, пробуем следующий источник.
// Прослушивание без скачивания работает и без CORS (обычный <audio src>), но только онлайн.
import { db } from '../db.js';
import { audioUrls } from './sources.js';

const CACHE_NAME = 'tartil-audio-v1';
const MIN_BYTES = 2000; // ответ меньше — это не аудио (страница ошибки и т.п.)
const CONCURRENCY = 3;

export const supported = () => 'caches' in self;
const cacheOpen = () => caches.open(CACHE_NAME);
const keyFor = (reciter, surah, ayah) => new Request(new URL(`audio-cache/${reciter}/${surah}/${ayah}`, document.baseURI).href);
const keyPrefix = (reciter, surah) => new URL(`audio-cache/${reciter}/${surah}/`, document.baseURI).href;

/** Множество номеров аятов суры, уже сохранённых для чтеца. */
export async function cachedAyahs(reciter, surah) {
  if (!supported()) return new Set();
  const cache = await cacheOpen();
  const prefix = keyPrefix(reciter, surah);
  const out = new Set();
  for (const req of await cache.keys()) if (req.url.startsWith(prefix)) out.add(+req.url.slice(prefix.length));
  return out;
}

/** Все сохранённые аяты: { "<чтец>:<сура>": число } — для списка загрузок в настройках. */
export async function cachedSummary() {
  if (!supported()) return {};
  const cache = await cacheOpen();
  const base = new URL('audio-cache/', document.baseURI).href;
  const out = {};
  for (const req of await cache.keys()) {
    if (!req.url.startsWith(base)) continue;
    const [reciter, surah] = req.url.slice(base.length).split('/');
    const k = `${reciter}:${surah}`;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export const bytesMeta = async (reciter, surah) => (await db.get('kv', `audio:${reciter}:${surah}`))?.bytes ?? null;

export async function deleteSurahAudio(reciter, surah) {
  if (!supported()) return 0;
  const cache = await cacheOpen();
  const prefix = keyPrefix(reciter, surah);
  let n = 0;
  for (const req of await cache.keys()) if (req.url.startsWith(prefix)) { await cache.delete(req); n++; }
  await db.delete('kv', `audio:${reciter}:${surah}`);
  return n;
}

export async function storageEstimate() {
  try { const e = await navigator.storage.estimate(); return { usage: e.usage ?? 0, quota: e.quota ?? 0 }; } catch { return null; }
}

/** Источник для проигрывания: сохранённый файл (blob-URL) или первый сетевой адрес. */
export async function resolvePlayable(reciter, surah, ayah) {
  if (supported()) {
    const hit = await (await cacheOpen()).match(keyFor(reciter, surah, ayah));
    if (hit) return { url: URL.createObjectURL(await hit.blob()), cached: true, revoke: true };
  }
  const urls = await audioUrls(reciter, surah, ayah);
  return { url: urls[0], cached: false, revoke: false };
}

// ───────── Скачивание ─────────
const jobs = new Map(); // "<чтец>:<сура>" → состояние
const listeners = new Set();
export const subscribeDownloads = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn());
export const getJob = (reciter, surah) => jobs.get(`${reciter}:${surah}`) ?? null;
export const activeJobs = () => [...jobs.values()].filter((j) => j.state === 'running');

async function fetchAyah(reciter, surah, ayah, signal) {
  let lastErr;
  for (const url of await audioUrls(reciter, surah, ayah)) {
    try {
      const res = await fetch(url, { mode: 'cors', signal });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const blob = await res.blob();
      if (blob.size < MIN_BYTES) { lastErr = new Error('пустой ответ'); continue; }
      return blob;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      lastErr = e; // TypeError = сеть или запрет CORS — пробуем следующий источник
    }
  }
  throw lastErr ?? new Error('нет источников');
}

/** Скачивает недостающие аяты суры. Возвращает Promise, выполняется в фоне; прогресс — через subscribeDownloads. */
export function startDownload(reciter, surah, count) {
  const id = `${reciter}:${surah}`;
  if (jobs.get(id)?.state === 'running') return jobs.get(id).promise;
  const ctrl = new AbortController();
  const job = { reciter, surah, total: count, done: 0, bytes: 0, failed: 0, state: 'running', error: null, ctrl };
  jobs.set(id, job);
  job.promise = (async () => {
    try {
      if (!supported()) throw new Error('Браузер не поддерживает офлайн-хранилище.');
      const cache = await cacheOpen();
      const have = await cachedAyahs(reciter, surah);
      const todo = [];
      for (let a = 1; a <= count; a++) { if (have.has(a)) job.done++; else todo.push(a); }
      emit();
      try { await navigator.storage?.persist?.(); } catch {}
      const worker = async () => {
        while (todo.length && !ctrl.signal.aborted) {
          const a = todo.shift();
          let blob = null;
          for (let attempt = 0; attempt < 3 && !blob; attempt++) {
            try { blob = await fetchAyah(reciter, surah, a, ctrl.signal); }
            catch (e) {
              if (e.name === 'AbortError') return;
              job.error = e instanceof TypeError ? 'нет сети или сервер не разрешает скачивание в приложение' : e.message;
              await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
          }
          if (blob) {
            await cache.put(keyFor(reciter, surah, a), new Response(blob, { headers: { 'content-type': blob.type || 'audio/mpeg' } }));
            job.bytes += blob.size; job.done++;
          } else job.failed++;
          emit();
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (ctrl.signal.aborted) job.state = 'canceled';
      else if (job.failed) job.state = 'error';
      else job.state = 'done';
      if (job.state === 'done') {
        const prev = (await db.get('kv', `audio:${reciter}:${surah}`))?.bytes ?? 0;
        await db.put('kv', `audio:${reciter}:${surah}`, { bytes: prev + job.bytes, at: Date.now() });
      }
    } catch (e) {
      job.state = 'error'; job.error = e.message;
    }
    emit();
  })();
  emit();
  return job.promise;
}

export function cancelDownload(reciter, surah) {
  jobs.get(`${reciter}:${surah}`)?.ctrl.abort();
}

export const formatBytes = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} МБ` : `${Math.max(1, Math.round(b / 1024))} КБ`);
