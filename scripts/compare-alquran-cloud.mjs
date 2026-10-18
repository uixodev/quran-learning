#!/usr/bin/env node
// Вторая проверка текста: сравнивает data/ с api.alquran.cloud.
// Запускайте у себя (из песочницы разработки api.alquran.cloud недоступен):
//
//   npm run data:compare-alquran
//
// Для каждой суры сравниваются издания quran-uthmani, ru.kuliev, en.transliteration.
// «Точное» совпадение — побайтно после NFC. «По скелету» — только буквы, без знаков:
// расхождение по скелету означает реальное различие текста и требует разбора;
// различие лишь в знаках — это орфографический вариант записи одного и того же.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { CACHE, DATA, readJson, writeJson, pad3 } from './lib/util.mjs';

const API = 'https://api.alquran.cloud/v1/surah';
const EDITIONS = { ar: 'quran-uthmani', ru: 'ru.kuliev', tr: 'en.transliteration' };
const skeleton = (s) => s.normalize('NFC')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏\s]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/[ىيٮیې]/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء');
const BISMILLAH_SKELETON = skeleton('بسم الله الرحمن الرحيم'); // alquran.cloud добавляет её к 1-му аяту сур (кроме 1 и 9)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CACHE_DIR = join(CACHE, 'alquran-cloud');

// Запросы идут по одному, с паузой; успешные ответы кэшируются, поэтому повторный запуск
// докачивает только то, что не удалось. Сбой одной суры не останавливает проверку.
async function get(url) {
  const file = join(CACHE_DIR, url.split('/v1/')[1].replace(/\//g, '_') + '.json');
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

const surahs = readJson(join(DATA, 'surahs.json')).filter((s) => s.available);
const tot = { ar: [0, 0, 0], ru: [0, 0, 0], tr: [0, 0, 0] }; // [всего, точно, по скелету/по тексту]
const issues = [];
const failed = [];
for (const s of surahs) {
  const mine = readJson(join(DATA, 'surah', `${pad3(s.id)}.json`)).ayahs;
  for (const [field, ed] of Object.entries(EDITIONS)) {
    let theirs;
    try { theirs = (await get(`${API}/${s.id}/${ed}`)).ayahs; }
    catch (e) { failed.push(`${s.id}/${ed}: ${e.message}`); continue; }
    mine.forEach((a, i) => {
      let t = theirs[i].text;
      if (field === 'ar' && i === 0 && s.id !== 1 && skeleton(t).startsWith(BISMILLAH_SKELETON)) t = t.split(' ').slice(4).join(' ');
      const x = tot[field]; x[0]++;
      const same = a[field].normalize('NFC') === t.normalize('NFC');
      const loose = field === 'ar' ? skeleton(a[field]) === skeleton(t) : same;
      if (same) x[1]++;
      if (loose) x[2]++;
      else issues.push(`${field} ${s.id}:${a.n}\n   у нас:  ${a[field]}\n   у них:  ${t}`);
    });
  }
  process.stdout.write(`сура ${s.id} ✓\n`);
}
if (failed.length) console.log(`\nНЕ УДАЛОСЬ СКАЧАТЬ (${failed.length}) — запустите команду ещё раз, она докачает недостающее:\n  ${failed.join('\n  ')}`);
console.log('\n         всего  точно  по тексту/скелету');
for (const [f, [a, b, c]] of Object.entries(tot)) console.log(`${f.padEnd(6)} ${String(a).padStart(6)} ${String(b).padStart(6)} ${String(c).padStart(8)}`);
if (issues.length) { console.log(`\nРасхождений: ${issues.length}\n`); console.log(issues.join('\n')); }
else console.log('\nРасхождений по тексту нет среди проверенного.');
process.exit(issues.length || failed.length ? 1 : 0);
