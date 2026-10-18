// Загрузка текстовых данных из ./data (кэшируются service worker'ом для офлайна).
const base = import.meta.env.BASE_URL;
const cache = new Map();

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`${base}data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${path}`);
      return r.json();
    }));
  }
  try { return await cache.get(path); } catch (e) { cache.delete(path); throw e; }
}

export const loadSurahs = () => getJson('surahs.json');
export const loadRules = () => getJson('tajweed-rules.json');
export const loadReciters = () => getJson('reciters.json');
export const loadSurah = (id) => getJson(`surah/${String(id).padStart(3, '0')}.json`);
