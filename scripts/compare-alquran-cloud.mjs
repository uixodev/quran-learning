#!/usr/bin/env node
// Вторая проверка текста: сравнивает data/ с api.alquran.cloud.
// Запускайте у себя (из песочницы разработки api.alquran.cloud недоступен):
//
//   npm run data:compare-alquran
//
// Сравниваются издания quran-uthmani, ru.kuliev, en.transliteration. Каждый аят попадает в одну из групп:
//   точно      — совпадает побайтно (после NFC);
//   вариант    — безобидное различие записи: арабский — только огласовки/написание хамзы и алифа;
//                русский — только завершающая пунктуация;
//   РАЗЛИЧИЕ   — настоящее расхождение, его нужно разобрать (печатается списком).
// Ответы кэшируются в .cache/alquran-cloud; при сбое сети повторный запуск докачивает недостающее.
import { join } from 'node:path';
import { DATA, readJson, pad3 } from './lib/util.mjs';
import { getEdition, stripTrailing } from './lib/alquran.mjs';

const EDITIONS = { ar: 'quran-uthmani', ru: 'ru.kuliev', tr: 'en.transliteration' };
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏\s]/g;
// Скелет: буквы без огласовок.
const skeleton = (s) => s.normalize('NFC').replace(MARKS, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/[ىيٮیې]/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء');
// Мягкий скелет: ещё и без алифов и хамз (в Tanzil «ءَاخِرَة», в мусхафе «ٱلۡأٓخِرَة»).
const loose = (s) => skeleton(s).replace(/[اء]/g, '');
const BISMILLAH = skeleton('بسم الله الرحمن الرحيم'); // alquran.cloud добавляет её к 1-му аяту сур (кроме 1 и 9)

const classify = {
  ar: (a, t) => (a === t ? 'exact' : skeleton(a) === skeleton(t) || loose(a) === loose(t) ? 'variant' : 'diff'),
  ru: (a, t) => (a === t ? 'exact' : stripTrailing(a) === stripTrailing(t) ? 'variant' : 'diff'),
  tr: (a, t) => (a === t ? 'exact' : 'diff'),
};

const surahs = readJson(join(DATA, 'surahs.json')).filter((s) => s.available);
const tot = { ar: { exact: 0, variant: 0, diff: 0 }, ru: { exact: 0, variant: 0, diff: 0 }, tr: { exact: 0, variant: 0, diff: 0 } };
const variants = [], issues = [], failed = [];

for (const s of surahs) {
  const mine = readJson(join(DATA, 'surah', `${pad3(s.id)}.json`)).ayahs;
  for (const [field, ed] of Object.entries(EDITIONS)) {
    let theirs;
    try { theirs = (await getEdition(s.id, ed)).ayahs; }
    catch (e) { failed.push(`${s.id}/${ed}: ${e.message}`); continue; }
    mine.forEach((a, i) => {
      let t = theirs[i].text.trim();
      if (field === 'ar' && i === 0 && s.id !== 1 && skeleton(t).startsWith(BISMILLAH)) t = t.split(' ').slice(4).join(' ');
      const kind = classify[field](a[field].normalize('NFC'), t.normalize('NFC'));
      tot[field][kind]++;
      if (kind === 'variant' && field === 'ar') variants.push(`${s.id}:${a.n}`);
      if (kind === 'diff') issues.push(`${field} ${s.id}:${a.n}\n   у нас:  ${a[field]}\n   у них:  ${t}`);
    });
  }
  process.stdout.write(`сура ${s.id} ✓\n`);
}

if (failed.length) console.log(`\nНЕ УДАЛОСЬ СКАЧАТЬ (${failed.length}) — запустите команду ещё раз:\n  ${failed.join('\n  ')}`);
console.log('\n        точно  вариант  РАЗЛИЧИЕ');
for (const [f, c] of Object.entries(tot)) console.log(`${f.padEnd(4)} ${String(c.exact).padStart(8)} ${String(c.variant).padStart(8)} ${String(c.diff).padStart(9)}`);
if (variants.length) console.log(`\nАрабский, вариант написания (огласовки/хамза): ${variants.join(', ')}`);
if (issues.length) { console.log(`\nРАЗЛИЧИЙ: ${issues.length}\n`); console.log(issues.join('\n')); }
else console.log('\nНастоящих различий нет среди проверенного.');
process.exit(issues.length || failed.length ? 1 : 0);
