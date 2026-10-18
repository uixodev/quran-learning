import { h } from './dom.js';
import { ayahMarker, toDisplay } from './display.js';

// Подписи правил (по описаниям источника — Quran.com) и порядок в легенде.
export const RULE_INFO = {
  ham_wasl: ['Хамзат аль-васль', 'Соединительная хамза: не читается при слитном чтении'],
  laam_shamsiyah: ['Солнечная «ляма»', 'Ляма артикля не читается, следующая буква удваивается'],
  slnt: ['Непроизносимая буква', 'Буква пишется, но не читается'],
  madda_normal: ['Мадд обычный', 'Протяжность в 2 счёта'],
  madda_permissible: ['Мадд допустимый', 'Протяжность в 2, 4 или 6 счётов'],
  madda_obligatory: ['Мадд обязательный', 'Протяжность в 4–5 счётов'],
  madda_necessary: ['Мадд необходимый', 'Протяжность в 6 счётов'],
  qalaqah: ['Калькаля', 'Отскок: звук «подпрыгивает» на сукуне'],
  ghunnah: ['Гунна', 'Носовой звук в нун и мим с шаддой'],
  ikhafa: ['Ихфа', 'Скрытое произнесение нун-сакина или танвина'],
  ikhafa_shafawi: ['Ихфа шафави', 'Скрытое произнесение мим-сакина перед «ба»'],
  idgham_ghunnah: ['Идгам с гунной', 'Слияние с носовым звуком'],
  idgham_wo_ghunnah: ['Идгам без гунны', 'Слияние без носового звука'],
  idgham_shafawi: ['Идгам шафави', 'Слияние мим-сакина с мим'],
  iqlab: ['Икляб', 'Превращение нун-сакина или танвина в мим перед «ба»'],
  idgham_mutajanisayn: ['Идгам мутаджанисайн', 'Слияние однородных по месту выхода букв'],
  idgham_mutaqaribayn: ['Идгам мутакарибайн', 'Слияние близких по месту выхода букв'],
};

/**
 * Возвращает элемент с текстом аята: окрашенные диапазоны таджвида (tj — [от, до, правило],
 * смещения в кодовых точках исходного текста) и, по желанию, знак конца аята.
 */
export function ayahText(ayah, rules, { tajweed = true, marker = true } = {}) {
  const cps = [...ayah.ar];
  const wrap = h('span', { class: 'ar-text' });
  let pos = 0;
  const emit = (to, rule) => {
    if (to <= pos) return;
    const txt = toDisplay(cps.slice(pos, to).join(''));
    wrap.append(rule == null ? document.createTextNode(txt) : h('span', { class: `tj tj-${rules[rule]}` }, txt));
    pos = to;
  };
  if (tajweed) {
    for (const [s, e, r] of ayah.tj) { emit(s, null); emit(e, r); }
  }
  emit(cps.length, null);
  if (marker) wrap.append(' ', h('span', { class: 'ayah-end' }, ayahMarker(ayah.n)));
  return wrap;
}

/** Легенда цветов: показываем только правила, встречающиеся в переданных данных (или все). */
export function legend(rules, used) {
  const items = rules
    .map((r, i) => [r, i])
    .filter(([, i]) => !used || used.has(i))
    .filter(([r]) => RULE_INFO[r]);
  return h(
    'ul',
    { class: 'legend' },
    items.map(([r]) =>
      h('li', {}, h('span', { class: `tj tj-${r} swatch` }, 'ـــ'), h('span', {}, h('b', {}, RULE_INFO[r][0]), h('small', {}, RULE_INFO[r][1]))),
    ),
  );
}
