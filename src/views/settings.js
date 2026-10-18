import { h } from '../dom.js';
import { settings, setSetting } from '../settings.js';

function segmented(name, options, value, onChange) {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': name },
    options.map(([v, label]) =>
      h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(v === value),
        class: v === value ? 'on' : '',
        onclick: (e) => {
          e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => {
            b.classList.toggle('on', b === e.currentTarget);
            b.setAttribute('aria-checked', String(b === e.currentTarget));
          });
          onChange(v);
        },
      }, label)),
  );
}

export async function settingsView() {
  return h('div', { class: 'stack' },
    h('header', { class: 'page-head' }, h('a', { class: 'back', href: '#/' }, '‹ Назад'), h('h1', {}, 'Настройки')),
    h('section', { class: 'card' },
      h('h2', {}, 'Тема'),
      segmented('Тема', [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']], settings.theme, (v) => setSetting('theme', v)),
    ),
    h('p', { class: 'muted small' }, 'Остальные настройки (чтение, чтец, загрузки, перенос прогресса) появятся в следующих этапах.'),
  );
}
