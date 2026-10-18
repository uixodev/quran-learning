// Экспорт и импорт всего прогресса в JSON-файл (чтобы ничего не потерялось при смене телефона).
import { db } from './db.js';

const APP = 'tartil';
const VERSION = 1;

export async function exportProgress() {
  const stores = {};
  for (const s of db.STORES) stores[s] = await db.all(s);
  const payload = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), stores };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tartil-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return Object.values(stores).reduce((n, s) => n + Object.keys(s).length, 0);
}

/** Проверяет файл и заменяет локальные данные содержимым файла. Бросает Error с понятным текстом. */
export async function importProgress(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('Файл не похож на сохранённый прогресс (не JSON).'); }
  if (data?.app !== APP || typeof data.stores !== 'object') throw new Error('Это не файл прогресса «Тартиль».');
  if (data.version > VERSION) throw new Error('Файл сохранён более новой версией приложения. Обновите приложение.');
  let count = 0;
  for (const s of db.STORES) {
    const entries = data.stores[s] ?? {};
    await db.clear(s);
    for (const [k, v] of Object.entries(entries)) { await db.put(s, k, v); count++; }
  }
  return count;
}
