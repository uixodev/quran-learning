#!/usr/bin/env node
// Собирает data/*.json из проверенных публичных источников. Текст НЕ набирается
// вручную: арабский, перевод и транслитерация берутся из npm-пакета quran-json
// (зафиксированная версия), разметка таджвида — из react-native-quran-tajweed.
//
//   node scripts/build-data.mjs          # аль-Фатиха + джуз Амма
//   node scripts/build-data.mjs --all    # все 114 сур
import { join } from 'node:path';
import { SOURCES, SURAHS_ALL, SURAHS_DEFAULT, SKIP_RULES } from './config.mjs';
import { DATA, fetchNpm, pad3, readJson, sha256, writeJson, readFileSync } from './lib/util.mjs';
import { align, key } from './lib/align.mjs';

const all = process.argv.includes('--all');
const surahs = all ? SURAHS_ALL : SURAHS_DEFAULT;

const qjDir = fetchNpm(SOURCES.quranJson.npm);
const tjDir = fetchNpm(SOURCES.tajweed.npm);
const tjIndex = readJson(join(tjDir, 'src/data/index.json'));

// Правила таджвида, которые окрашиваем (индекс в итоговом массиве).
const ruleNames = tjIndex.legend.filter((r) => !SKIP_RULES.has(r));
const srcRuleToOut = tjIndex.legend.map((r) => ruleNames.indexOf(r)); // -1 = пропуск

const meta = [];
const stats = { rulesIn: 0, rulesMapped: 0, ayahs: 0, lowCoverage: [] };

for (let id = 1; id <= 114; id++) {
  const q = readJson(join(qjDir, 'dist/chapters/ru', `${id}.json`));
  meta.push({
    id,
    ar: q.name,
    lat: q.transliteration,       // латиница: «Al-Fatihah»
    ru: q.translation,            // смысл названия по-русски (из источника)
    type: q.type,                 // meccan | medinan (из источника)
    ayahs: q.total_verses,
    intro: null,                  // краткое введение: нет проверенного источника
    available: surahs.includes(id),
  });
  if (!surahs.includes(id)) continue;

  const t = readJson(join(tjDir, 'src/data', `surah_${pad3(id)}.json`));
  const out = [];
  for (const v of q.verses) {
    const ta = t.ayahs.find((a) => a.ayah === v.id);
    // Текст таджвида посимвольно: символ + набор правил.
    const tcp = [], trules = [];
    for (const [txt, rules] of ta.s) {
      const r = rules.map((i) => srcRuleToOut[i]).filter((i) => i >= 0)[0] ?? -1;
      for (const ch of txt) { tcp.push(ch); trules.push(r); }
    }
    const { map, matched, total } = align(tcp.join(''), v.text);
    const base = [...v.text];
    const labels = new Array(base.length).fill(-1);
    tcp.forEach((_, i) => {
      if (trules[i] >= 0 && key(tcp[i])) {
        stats.rulesIn++;
        if (map[i] >= 0) { labels[map[i]] = trules[i]; stats.rulesMapped++; }
      }
    });
    // Склеиваем подряд идущие символы с одним правилом в диапазоны [от, до, правило).
    const tj = [];
    for (let i = 0; i < labels.length; ) {
      if (labels[i] < 0) { i++; continue; }
      let j = i + 1;
      while (j < labels.length && labels[j] === labels[i]) j++;
      tj.push([i, j, labels[i]]);
      i = j;
    }
    stats.ayahs++;
    if (matched / total < 0.9) stats.lowCoverage.push(`${id}:${v.id} ${(100 * matched / total).toFixed(0)}%`);
    out.push({ n: v.id, ar: v.text, tj, ru: v.translation, tr: v.transliteration });
  }
  writeJson(join(DATA, 'surah', `${pad3(id)}.json`), { id, ayahs: out });
}

writeJson(join(DATA, 'surahs.json'), meta);
writeJson(join(DATA, 'tajweed-rules.json'), ruleNames);

// Паспорт данных: что собрано и из чего (для README и воспроизводимости).
const pkgVer = (d) => readJson(join(d, 'package.json')).version;
writeJson(
  join(DATA, 'sources.json'),
  {
    generatedBy: 'scripts/build-data.mjs',
    surahs,
    sources: {
      'quran-json': { npm: SOURCES.quranJson.npm, version: pkgVer(qjDir), license: 'CC-BY-4.0',
        used: 'арабский текст (Uthmani), перевод Э. Кулиева (Tanzil ru.kuliev), транслитерация (Tanzil en.transliteration), названия и тип сур',
        sha256_ru_chapter_1: sha256(readFileSync(join(qjDir, 'dist/chapters/ru/1.json'))) },
      'react-native-quran-tajweed': { npm: SOURCES.tajweed.npm, version: pkgVer(tjDir), license: 'MIT',
        used: 'разметка таджвида (Quran.com text_uthmani_tajweed), перенесённая на базовый текст' },
    },
    tajweedMapping: { rulesInSource: stats.rulesIn, rulesMapped: stats.rulesMapped,
      mappedPercent: +(100 * stats.rulesMapped / stats.rulesIn).toFixed(2), lowCoverageAyahs: stats.lowCoverage },
  },
  true,
);

console.log(`Суры: ${surahs.length}, аятов: ${stats.ayahs}`);
console.log(`Таджвид перенесён: ${stats.rulesMapped}/${stats.rulesIn} (${(100 * stats.rulesMapped / stats.rulesIn).toFixed(2)}%)`);
if (stats.lowCoverage.length) console.log('Аяты с низким совпадением:', stats.lowCoverage.join(', '));
