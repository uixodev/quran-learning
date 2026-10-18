#!/usr/bin/env node
// Накладывает на data/ два издания alquran.cloud (запускать у себя; из песочницы разработки
// api.alquran.cloud недоступен):
//
//   npm run data:import-alquran     затем:  git add data && git commit -m "..." && git push
//
//  • ru: перевод Кулиева. В исходной копии (Tanzil через quran-json) нет завершающих знаков
//    препинания («?», «!», «.»), а в alquran.cloud (ru.kuliev) они есть. Текст заменяется ТОЛЬКО
//    если без завершающей пунктуации он совпадает с нашим; иначе аят остаётся прежним и попадает
//    в отчёт.
//  • tr: транслитерация заменяется изданием en.transliteration — оно читается проще
//    (напр. «Wallaili izaa yaghshaa») и не содержит опечаток исходной копии (напр. 114:6).
import { join } from 'node:path';
import { DATA, pad3, readJson, writeJson } from './lib/util.mjs';
import { getEdition, stripTrailing } from './lib/alquran.mjs';

const surahs = readJson(join(DATA, 'surahs.json')).filter((s) => s.available);
const report = { ruChanged: 0, ruSame: 0, ruKept: [], trChanged: 0, trSame: 0, failed: [] };

for (const s of surahs) {
  const file = join(DATA, 'surah', `${pad3(s.id)}.json`);
  const doc = readJson(file);
  let ru, tr;
  try {
    ru = (await getEdition(s.id, 'ru.kuliev')).ayahs;
    tr = (await getEdition(s.id, 'en.transliteration')).ayahs;
  } catch (e) { report.failed.push(`${s.id}: ${e.message}`); continue; }
  if (ru.length !== doc.ayahs.length || tr.length !== doc.ayahs.length) { report.failed.push(`${s.id}: другое число аятов`); continue; }

  doc.ayahs.forEach((a, i) => {
    const theirsRu = ru[i].text.trim();
    if (theirsRu === a.ru) report.ruSame++;
    else if (stripTrailing(theirsRu) === stripTrailing(a.ru)) { a.ru = theirsRu; report.ruChanged++; }
    else report.ruKept.push(`${s.id}:${a.n}\n   у нас:  ${a.ru}\n   у них:  ${theirsRu}`);

    const theirsTr = tr[i].text.trim();
    if (theirsTr === a.tr) report.trSame++; else { a.tr = theirsTr; report.trChanged++; }
  });
  writeJson(file, doc);
  process.stdout.write(`сура ${s.id} ✓\n`);
}

// Запись в паспорт данных.
const srcFile = join(DATA, 'sources.json');
const src = readJson(srcFile);
src.overlay = {
  by: 'scripts/import-alquran.mjs',
  source: 'https://api.alquran.cloud (издания ru.kuliev и en.transliteration)',
  ru: 'завершающая пунктуация перевода Кулиева; слова не менялись (проверяется)',
  tr: 'издание en.transliteration целиком (латиница)',
  appliedTo: surahs.map((s) => s.id).filter((id) => !report.failed.some((f) => f.startsWith(`${id}:`))),
};
writeJson(srcFile, src, true);

console.log(`\nru: изменено ${report.ruChanged}, без изменений ${report.ruSame}, оставлено прежним ${report.ruKept.length}`);
console.log(`tr: изменено ${report.trChanged}, без изменений ${report.trSame}`);
if (report.ruKept.length) console.log('\nПеревод отличается не только пунктуацией (оставлен прежний):\n' + report.ruKept.join('\n'));
if (report.failed.length) console.log(`\nНЕ УДАЛОСЬ (${report.failed.length}) — запустите ещё раз, команда докачает недостающее:\n  ${report.failed.join('\n  ')}`);
process.exit(report.failed.length ? 1 : 0);
