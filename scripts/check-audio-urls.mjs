#!/usr/bin/env node
// Проверяет адреса аудио из data/reciters.json и — главное — разрешает ли сервер CORS.
// Запускайте у себя: из песочницы разработки everyayah.com и cdn.islamic.network недоступны.
//
//   npm run audio:check
//
// Что значит результат для приложения:
//   CORS: да   — приложение может СКАЧАТЬ файл и сохранить для работы офлайн.
//   CORS: нет  — скачать в приложение нельзя; слушать можно только онлайн («потоком»).
//                Приложение само перейдёт к следующему источнику из списка.
import { join } from 'node:path';
import { DATA, readJson } from './lib/util.mjs';

const cfg = readJson(join(DATA, 'reciters.json'));
const surahs = readJson(join(DATA, 'surahs.json'));
const ORIGIN = 'https://uixodev.github.io'; // адрес, с которого работает приложение
const pad3 = (n) => String(n).padStart(3, '0');
const globalN = (s, a) => surahs.filter((x) => x.id < s).reduce((n, x) => n + x.ayahs, 0) + a;
const fill = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const samples = [[1, 1], [1, 7], [78, 1], [93, 11], [112, 4], [114, 6]];

let bad = 0;
const verdict = [];
for (const r of cfg.reciters) {
  for (const src of r.sources) {
    let ok = 0, corsOk = 0, ctype = '';
    for (const [s, a] of samples) {
      const url = src.type === 'everyayah'
        ? fill(cfg.templates.everyayah, { folder: src.folder, s: pad3(s), a: pad3(a) })
        : fill(cfg.templates.islamic, { bitrate: src.bitrate, edition: src.edition, n: globalN(s, a) });
      let line;
      try {
        const res = await fetch(url, { method: 'GET', headers: { Origin: ORIGIN, Range: 'bytes=0-1023' } });
        const acao = res.headers.get('access-control-allow-origin');
        ctype = res.headers.get('content-type') ?? '';
        const good = res.status === 200 || res.status === 206;
        const cors = acao === '*' || acao === ORIGIN;
        if (good) ok++; if (good && cors) corsOk++;
        line = `${good ? '✓' : '✗'} ${res.status}  CORS:${cors ? 'да' : 'нет'}  ${ctype}`;
      } catch (e) { line = `✗ ${e.cause?.code ?? e.message}`; }
      console.log(`${r.id.padEnd(8)} ${src.type.padEnd(9)} ${s}:${a}  ${line}  ${url}`);
    }
    const all = ok === samples.length;
    if (!all) bad++;
    verdict.push(`${r.id.padEnd(8)} ${src.type.padEnd(9)} файлы: ${all ? 'доступны' : `ПРОБЛЕМА (${ok}/${samples.length})`}   скачивание в приложение (CORS): ${corsOk === samples.length ? 'ДА' : corsOk ? 'частично' : 'НЕТ'}`);
  }
}
console.log('\n── Итог ──\n' + verdict.join('\n'));
process.exit(bad ? 1 : 0);
