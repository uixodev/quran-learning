import { h, icon, ICONS } from '../dom.js';
import { loadRules, loadSurah, loadSurahs } from '../data.js';
import { ayahText, legend } from '../tajweed.js';
import { settings } from '../settings.js';

export async function homeView() {
  const [surahs, rules, fatiha] = await Promise.all([loadSurahs(), loadRules(), loadSurah(1)]);
  const s = surahs[0];
  const used = new Set(fatiha.ayahs.flatMap((a) => a.tj.map((t) => t[2])));

  return h(
    'div',
    { class: 'stack' },
    h('header', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Ас-саляму алейкум'), h('h1', {}, 'Тартиль')),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Настройки' }, icon(ICONS.settings)),
    ),
    h('a', { class: 'card continue', href: '#/surahs' },
      h('span', { class: 'eyebrow' }, 'Начать'),
      h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, s.ar),
      h('strong', {}, `Сура ${s.id}. ${s.ru}`),
      h('span', { class: 'muted' }, `${s.lat} · ${s.ayahs} аятов`),
      h('span', { class: 'chev' }, icon(ICONS.chevron)),
    ),
    h('section', { class: 'card' },
      h('h2', {}, 'Так выглядит чтение'),
      h('p', { class: 'muted' }, 'Текст из проверенных источников, цветом отмечены правила таджвида.'),
      h('div', { class: 'ar-block', lang: 'ar', dir: 'rtl', style: `font-size:${settings.arabicSize}px` },
        fatiha.ayahs.map((a) => ayahText(a, rules)).flatMap((n) => [n, ' ']),
      ),
      h('details', {}, h('summary', {}, 'Обозначения цветов'), legend(rules, used)),
    ),
  );
}
