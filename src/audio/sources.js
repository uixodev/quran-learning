// Адреса аудио одного аята. Источники пробуются по порядку (см. data/reciters.json).
import { loadReciters, loadSurahs } from '../data.js';

const pad3 = (n) => String(n).padStart(3, '0');

/** Для проверки без интернета/внешних серверов: localStorage['tartil.audioUrl'] = шаблон с {s} {a} {n}. */
function override() {
  try { return localStorage.getItem('tartil.audioUrl') || null; } catch { return null; }
}

/** Порядковый номер аята во всём Коране (1…6236) — нужен для cdn.islamic.network. */
export async function globalAyahNumber(surah, ayah) {
  const surahs = await loadSurahs();
  let n = 0;
  for (const s of surahs) { if (s.id === surah) break; n += s.ayahs; }
  return n + ayah;
}

/** Список адресов (по порядку предпочтения) для аята. */
export async function audioUrls(reciterId, surah, ayah) {
  const cfg = await loadReciters();
  const reciter = cfg.reciters.find((r) => r.id === reciterId) ?? cfg.reciters[0];
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  const urls = [];
  const o = override();
  if (o) urls.push(fill(o, { s: pad3(surah), a: pad3(ayah), n: String(await globalAyahNumber(surah, ayah)), folder: reciter.sources[0]?.folder ?? '' }));
  for (const src of reciter.sources) {
    if (src.type === 'everyayah') urls.push(fill(cfg.templates.everyayah, { folder: src.folder, s: pad3(surah), a: pad3(ayah) }));
    if (src.type === 'islamic') urls.push(fill(cfg.templates.islamic, { bitrate: src.bitrate, edition: src.edition, n: await globalAyahNumber(surah, ayah) }));
  }
  return urls;
}

export async function reciterInfo(reciterId) {
  const cfg = await loadReciters();
  return cfg.reciters.find((r) => r.id === reciterId) ?? cfg.reciters[0];
}
