import { h } from '../dom.js';
import { loadSurah, loadSurahs } from '../data.js';
import { ayahText } from '../tajweed.js';
import { markStepDone, getProgress, setLast } from '../progress.js';
import { settings } from '../settings.js';
import { go } from '../router.js';
import { pluralAyahs, subHeader, TYPE_RU } from '../ui.js';

export async function understandView({ id }) {
  const [surahs, surah, progress] = await Promise.all([loadSurahs(), loadSurah(+id), getProgress(+id)]);
  const s = surahs.find((x) => x.id === +id);
  setLast(s.id, 'understand');
  const done = !!progress.steps.understand;

  const facts = h('dl', { class: 'facts' },
    h('div', {}, h('dt', {}, 'Сура №'), h('dd', {}, String(s.id))),
    h('div', {}, h('dt', {}, 'Откровение'), h('dd', {}, TYPE_RU[s.type] ?? '—')),
    h('div', {}, h('dt', {}, 'Аятов'), h('dd', {}, String(s.ayahs))),
  );

  const ayah = (a) => h('article', { class: 'meaning' },
    h('span', { class: 'badge', 'aria-label': `Аят ${a.n}` }, a.n),
    h('div', {},
      h('p', { class: 'ru-text' }, a.ru),
      h('p', { class: 'ar-small', lang: 'ar', dir: 'rtl' }, ayahText(a, [], { tajweed: false, marker: false }))));

  return h('div', { class: 'stack' },
    subHeader(`#/surah/${s.id}`, s.ru, 'Понять', 'Прочитайте смысл каждого аята.'),
    h('section', { class: 'card intro' },
      h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, s.ar),
      h('h2', {}, `Сура ${s.id}. ${s.ru}`),
      h('p', { class: 'muted' }, `${s.lat} · ${pluralAyahs(s.ayahs)}`),
      facts,
      s.intro ? h('p', {}, s.intro) : null),
    h('section', { class: 'meanings', style: `--ar-size:${Math.round(settings.arabicSize * 0.7)}px` }, surah.ayahs.map(ayah)),
    h('div', { class: 'action-bar' },
      h('button', { class: 'btn primary', type: 'button', onclick: async () => { await markStepDone(s.id, 'understand'); go(`/surah/${s.id}`); } },
        done ? 'Вернуться к шагам' : 'Понятно — дальше')),
  );
}
