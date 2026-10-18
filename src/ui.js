import { h } from './dom.js';

export const TYPE_RU = { meccan: 'Мекканская', medinan: 'Мединская' };

export function pluralAyahs(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} аят`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} аята`;
  return `${n} аятов`;
}

/** Переключатель с подписью (доступный: role="switch"). */
export function toggle(label, value, onChange, hint) {
  const btn = h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!value), class: 'switch' },
    h('span', { class: 'knob' }));
  const row = h('label', { class: 'row-toggle' },
    h('span', { class: 'row-text' }, h('b', {}, label), hint ? h('small', {}, hint) : null),
    btn);
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(on));
    onChange(on);
  });
  return row;
}

/** Шапка вложенного экрана: «‹ Назад», заголовок. */
export function subHeader(backHref, backLabel, title, sub) {
  return h('header', { class: 'page-head col' },
    h('a', { class: 'back', href: backHref }, `‹ ${backLabel}`),
    h('h1', {}, title),
    sub ? h('p', { class: 'muted' }, sub) : null);
}

export const progressBar = (done, total) =>
  h('span', { class: 'bar', role: 'img', 'aria-label': `Пройдено шагов: ${done} из ${total}` },
    h('span', { style: `width:${(100 * done) / total}%` }));
