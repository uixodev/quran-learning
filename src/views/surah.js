import { h, icon, ICONS } from '../dom.js';
import { loadSurahs } from '../data.js';
import { getProgress, setLast } from '../progress.js';
import { stepStates, stepsDone, STEPS } from '../steps.js';
import { pluralAyahs, progressBar, subHeader, TYPE_RU } from '../ui.js';

export async function surahView({ id }) {
  const [surahs, progress] = await Promise.all([loadSurahs(), getProgress(+id)]);
  const s = surahs.find((x) => x.id === +id && x.available);
  if (!s) return h('p', { class: 'error' }, 'Такой суры пока нет в приложении.');
  const states = stepStates(progress);
  const done = stepsDone(progress);
  const current = states.find((x) => x.state === 'current' && x.ready);
  if (current) setLast(s.id, current.id);

  const node = (st) => {
    const open = st.ready;
    const mark = st.state === 'done' ? '✓' : st.n;
    const body = [
      h('span', { class: 'node-dot', 'aria-hidden': 'true' }, mark),
      h('span', { class: 'node-text' }, h('b', {}, st.title), h('small', {}, open ? st.hint : 'Скоро')),
      open ? h('span', { class: 'chev' }, icon(ICONS.chevron, 20)) : null,
    ];
    const state = { done: 'пройден', current: 'текущий шаг', todo: 'не начат' }[st.state];
    const attrs = { class: `node ${st.state}${open ? '' : ' soon'}`, 'aria-label': `Шаг ${st.n}: ${st.title}, ${open ? state : 'скоро'}` };
    return open
      ? h('a', { ...attrs, href: `#/surah/${s.id}/${st.id}` }, body)
      : h('div', { ...attrs, 'aria-disabled': 'true' }, body);
  };

  return h('div', { class: 'stack' },
    subHeader('#/surahs', 'Суры', s.ru, `${s.lat} · ${TYPE_RU[s.type] ?? ''} · ${pluralAyahs(s.ayahs)}`),
    h('div', { class: 'card surah-hero' },
      h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, s.ar),
      h('div', { class: 'hero-progress' }, progressBar(done, STEPS.length), h('small', {}, `${done} из ${STEPS.length} шагов`))),
    h('nav', { class: 'path', 'aria-label': 'Шаги изучения' }, states.map(node)),
  );
}
