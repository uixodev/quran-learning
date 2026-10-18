import { h } from '../dom.js';
import { loadSurahs } from '../data.js';
import { getAllProgress } from '../progress.js';
import { STEPS, stepsDone } from '../steps.js';
import { pluralAyahs, progressBar } from '../ui.js';

export async function surahsView() {
  const [surahs, progress] = await Promise.all([loadSurahs(), getAllProgress()]);
  const list = surahs.filter((s) => s.available);

  const row = (s) => {
    const done = stepsDone(progress[`s:${s.id}`]);
    return h('a', { class: 'surah-row', href: `#/surah/${s.id}` },
      h('span', { class: 'num' }, s.id),
      h('span', { class: 'names' },
        h('b', {}, s.ru),
        h('small', {}, `${s.lat} · ${pluralAyahs(s.ayahs)}`),
        done ? h('span', { class: 'row-progress' }, progressBar(done, STEPS.length), h('small', {}, `${done} из ${STEPS.length}`)) : null),
      h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, s.ar));
  };

  const fatiha = list.filter((s) => s.id === 1);
  const amma = list.filter((s) => s.id >= 78);
  const other = list.filter((s) => s.id !== 1 && s.id < 78);
  return h('div', { class: 'stack' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Суры')),
    fatiha.length ? h('section', {}, h('h2', { class: 'group' }, 'Начало'), h('div', { class: 'list' }, fatiha.map(row))) : null,
    amma.length ? h('section', {}, h('h2', { class: 'group' }, 'Джуз Амма'), h('div', { class: 'list' }, amma.map(row))) : null,
    other.length ? h('section', {}, h('h2', { class: 'group' }, 'Другие суры'), h('div', { class: 'list' }, other.map(row))) : null,
  );
}
