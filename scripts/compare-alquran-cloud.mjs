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
import { DATA, readJson, pad3 } from './lib/util.mjs';

const API = 'https://api.alquran.cloud/v1/surah';
const EDITIONS = { ar: 'quran-uthmani', ru: 'ru.kuliev', tr: 'en.transliteration' };
const skeleton = (s) => s.normalize('NFC')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏\s]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/[ىيٮیې]/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء');
const BISMILLAH_SKELETON = skeleton('بسم الله الرحمن الرحيم'); // alquran.cloud добавляет её к 1-му аяту сур (кроме 1 и 9)

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url); if (r.ok) return (await r.json()).data; } catch {}
    await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
  }
  throw new Error('не удалось скачать ' + url);
}

const surahs = readJson(join(DATA, 'surahs.json')).filter((s) => s.available);
const tot = { ar: [0, 0, 0], ru: [0, 0, 0], tr: [0, 0, 0] }; // [всего, точно, по скелету/по тексту]
const issues = [];
for (const s of surahs) {
  const mine = readJson(join(DATA, 'surah', `${pad3(s.id)}.json`)).ayahs;
  for (const [field, ed] of Object.entries(EDITIONS)) {
    const theirs = (await get(`${API}/${s.id}/${ed}`)).ayahs;
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
console.log('\n         всего  точно  по тексту/скелету');
for (const [f, [a, b, c]] of Object.entries(tot)) console.log(`${f.padEnd(6)} ${String(a).padStart(6)} ${String(b).padStart(6)} ${String(c).padStart(8)}`);
if (issues.length) { console.log(`\nРасхождений: ${issues.length}\n`); console.log(issues.join('\n')); process.exit(1); }
console.log('\nРасхождений по тексту нет.');
