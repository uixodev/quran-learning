#!/usr/bin/env node
// Независимая проверка собранных данных (запускать после build-data.mjs).
//  1. Перевод Кулиева и транслитерация сверяются с другой копией Tanzil
//     (fawazahmed0/quran-api) — должны совпадать побайтно.
//  2. Арабский текст сверяется со вторым источником (QUL/Tarteel) по
//     «скелету» букв (без огласовок) — расхождения только в орфографии знаков.
//  3. Целостность: число аятов, диапазоны таджвида.
import { join } from 'node:path';
import { SOURCES } from './config.mjs';
import { DATA, fetchFile, fetchNpm, readJson, pad3 } from './lib/util.mjs';
import { stripTrailing } from './lib/alquran.mjs';

const surahs = readJson(join(DATA, 'surahs.json')).filter((s) => s.available);
// Если применён scripts/import-alquran.mjs, пунктуация перевода и транслитерация берутся из alquran.cloud.
const overlay = readJson(join(DATA, 'sources.json')).overlay;
let fail = 0;
const err = (m) => { fail++; console.log('✗', m); };

// 1. Tanzil-копия
const ruFile = await fetchFile(`${SOURCES.fawaz.base}/rus-elmirkuliev.json`, 'fawaz/rus-elmirkuliev.json');
const trFile = await fetchFile(`${SOURCES.fawaz.base}/ara-quran-la.json`, 'fawaz/ara-quran-la.json');
const idx = (f) => Object.fromEntries(readJson(f).quran.map((x) => [`${x.chapter}:${x.verse}`, x.text]));
const RU = idx(ruFile), TR = idx(trFile);

// 2. QUL
const qul = readJson(join(fetchNpm(SOURCES.qul.npm), 'data/quran-verses.json'));
const QUL = Object.fromEntries(Object.values(qul).map((o) => [`${o.surah}:${o.ayah}`, o.text]));
// Хамза на подставке: «يٕ» (буква + знак U+0654/U+0655) и готовая «ئ» — одна и та же буква.
const HAMZA_SEAT = /[\u0627\u0648\u064A\u0649]?[\u0654\u0655]/g;
const skeleton = (s) => s.normalize('NFC').replace(HAMZA_SEAT, '\u0621')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏\s]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/[ىيٮیې]/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء');

// Буквы совпадают, либо различаются только записью хамзы/алифа («ٱلۡأٓخِرَة» в мусхафе, «ءَاخِرَة» у Tanzil).
const loose = (s) => skeleton(s).replace(/[\u0627\u0621]/g, '');
const sameLetters = (a, b) => skeleton(a) === skeleton(b) || loose(a) === loose(b);

let n = 0, ruBad = 0, trBad = 0, arBad = 0;
const arList = [];
for (const meta of surahs) {
  const { ayahs } = readJson(join(DATA, 'surah', `${pad3(meta.id)}.json`));
  if (ayahs.length !== meta.ayahs) err(`${meta.id}: аятов ${ayahs.length}, ожидалось ${meta.ayahs}`);
  for (const a of ayahs) {
    n++;
    const k = `${meta.id}:${a.n}`;
    // С наложением alquran.cloud допустимо отличие только завершающей пунктуацией.
    const ruOk = overlay ? stripTrailing(a.ru) === stripTrailing(RU[k] ?? '') : a.ru === RU[k];
    if (!ruOk) { ruBad++; err(`перевод ${k} отличается от Tanzil`); }
    if (!overlay && a.tr !== TR[k]) { trBad++; err(`транслитерация ${k} отличается от Tanzil`); }
    if (!sameLetters(a.ar, QUL[k] ?? '')) { arBad++; arList.push(k); }
    const len = [...a.ar].length;
    for (const [s, e, r] of a.tj) if (!(0 <= s && s < e && e <= len && r >= 0)) err(`таджвид ${k}: диапазон ${s}-${e}`);
  }
}
console.log(`Проверено аятов: ${n}`);
console.log(`Перевод Кулиева ≠ Tanzil${overlay ? ' (кроме пунктуации)' : ''}: ${ruBad}`);
console.log(overlay ? 'Транслитерация: из alquran.cloud (en.transliteration), с Tanzil не сравнивается' : `Транслитерация ≠ Tanzil:         ${trBad}`);
console.log(`Арабский ≠ QUL (буквы):         ${arBad}${arList.length ? '  → ' + arList.join(', ') : ''}`);
console.log(fail ? `\nОшибок: ${fail}` : '\nВсё сошлось.');
process.exit(fail ? 1 : 0);
