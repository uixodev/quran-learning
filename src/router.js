import { h, icon, ICONS } from './dom.js';

const TABS = [
  { path: '/', label: 'Главная', icon: ICONS.home },
  { path: '/surahs', label: 'Суры', icon: ICONS.book },
  { path: '/duas', label: 'Дуа', icon: ICONS.dua },
  { path: '/review', label: 'Повторение', icon: ICONS.repeat },
  { path: '/progress', label: 'Прогресс', icon: ICONS.chart },
];

const routes = [];
export const route = (pattern, view, { tab } = {}) => routes.push({ pattern, view, tab });

export const go = (path) => { location.hash = '#' + path; };
const current = () => location.hash.replace(/^#/, '') || '/';

function match(path) {
  for (const r of routes) {
    const names = [];
    const re = new RegExp('^' + r.pattern.replace(/:([a-z]+)/gi, (_, n) => (names.push(n), '([^/]+)')) + '$');
    const m = path.match(re);
    if (m) return { r, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function mountRouter(root) {
  const main = h('main', { class: 'screen', id: 'main', tabindex: '-1' });
  const nav = h(
    'nav',
    { class: 'tabbar', 'aria-label': 'Основная навигация' },
    TABS.map((t) => h('a', { href: '#' + t.path, class: 'tab', dataset: { path: t.path } }, icon(t.icon, 24), h('span', {}, t.label))),
  );
  root.replaceChildren(h('a', { class: 'skip', href: '#main' }, 'К содержимому'), main, nav);

  let token = 0;
  async function render() {
    const my = ++token;
    const found = match(current());
    const { r, params } = found ?? match('/');
    const activeTab = r.tab ?? '/';
    nav.querySelectorAll('.tab').forEach((a) => {
      const on = a.dataset.path === activeTab;
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    main.replaceChildren(h('p', { class: 'loading' }, 'Загрузка…'));
    try {
      const view = await r.view(params);
      if (my !== token) return;
      main.replaceChildren(view);
    } catch (e) {
      console.error(e);
      if (my === token) main.replaceChildren(h('p', { class: 'error' }, 'Не удалось открыть экран. Попробуйте ещё раз.'));
    }
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  addEventListener('hashchange', render);
  return render();
}
