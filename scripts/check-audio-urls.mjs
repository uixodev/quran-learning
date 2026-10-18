#!/usr/bin/env node
// Проверяет, что адреса аудио из data/reciters.json действительно существуют
// (HEAD-запросы к первому, среднему и последнему аяту нескольких сур).
// Запускайте у себя: из песочницы разработки everyayah.com недоступен.
//
//   npm run audio:check
import { join } from 'node:path';
import { DATA, readJson } from './lib/util.mjs';

const { reciters, audioUrl } = readJson(join(DATA, 'reciters.json'));
const samples = [[1, 1], [1, 7], [78, 1], [93, 11], [112, 4], [114, 6]];
let bad = 0;
for (const r of reciters) {
  for (const [s, a] of samples) {
    const url = audioUrl.replace('{folder}', r.folder).replace('{s}', String(s).padStart(3, '0')).replace('{a}', String(a).padStart(3, '0'));
    let status = 0;
    try { status = (await fetch(url, { method: 'HEAD' })).status; } catch (e) { status = e.message; }
    const ok = status === 200;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${r.id.padEnd(8)} ${s}:${a}  ${status}  ${url}`);
  }
}
process.exit(bad ? 1 : 0);
