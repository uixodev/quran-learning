import { h, icon, ICONS } from '../dom.js';
import { loadSurahs } from '../data.js';
import { getAllProgress, getLast } from '../progress.js';
import { STEPS, stepStates, stepsDone } from '../steps.js';
import { pluralAyahs, progressBar } from '../ui.js';

export async function homeView() {
  const [surahs, progress, last] = await Promise.all([loadSurahs(), getAllProgress(), getLast()]);
  const avail = surahs.filter((s) => s.available);
  const fresh = avail.find((s) => !stepsDone(progress[`s:${s.id}`])) ?? avail[0];
  const cur = (last?.kind === 's' && avail.find((s) => s.id === last.id)) || fresh;
  const p = progress[`s:${cur.id}`];
  const started = stepsDone(p) > 0 || last?.id === cur.id;
  const nextStep = stepStates(p).find((x) => x.state === 'current' && x.ready) ?? null;
  const target = nextStep ? `#/surah/${cur.id}/${nextStep.id}` : `#/surah/${cur.id}`;

  // «Дальше»: следующая по порядку сура без прогресса.
  const up = avail.filter((s) => s.id !== cur.id && !stepsDone(progress[`s:${s.id}`])).slice(0, 2);

  return h('div', { class: 'stack' },
    h('header', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Ас-саляму алейкум'), h('h1', {}, 'Тартиль')),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Настройки' }, icon(ICONS.settings))),
    h('a', { class: 'card continue', href: target },
      h('span', { class: 'eyebrow' }, started ? 'Продолжить' : 'Начать'),
      h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, cur.ar),
      h('strong', {}, `Сура ${cur.id}. ${cur.ru}`),
      h('span', { class: 'muted' }, nextStep ? `Шаг ${nextStep.n}: ${nextStep.title} · ${pluralAyahs(cur.ayahs)}` : `Готовые шаги пройдены · остальные скоро`),
      h('span', { class: 'hero-progress' }, progressBar(stepsDone(p), STEPS.length)),
      h('span', { class: 'chev' }, icon(ICONS.chevron))),
    up.length ? h('section', {},
      h('h2', { class: 'group' }, 'Дальше'),
      h('div', { class: 'list' }, up.map((s) =>
        h('a', { class: 'surah-row', href: `#/surah/${s.id}` },
          h('span', { class: 'num' }, s.id),
          h('span', { class: 'names' }, h('b', {}, s.ru), h('small', {}, `${s.lat} · ${pluralAyahs(s.ayahs)}`)),
          h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, s.ar))))) : null,
  );
}
