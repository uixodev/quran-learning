import { h } from '../dom.js';

export const placeholderView = (title, text) => () =>
  h('div', { class: 'stack' },
    h('header', { class: 'page-head' }, h('h1', {}, title)),
    h('div', { class: 'card empty' }, h('p', {}, text)),
  );
