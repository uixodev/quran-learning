import { h } from '../dom.js';
import { loadRules, loadSurah, loadSurahs } from '../data.js';
import { ayahText, legend } from '../tajweed.js';
import { markStepDone, getProgress, setLast } from '../progress.js';
import { settings, setSetting } from '../settings.js';
import { go } from '../router.js';
import { subHeader, toggle } from '../ui.js';

export async function readView({ id }) {
  const [surahs, surah, rules, progress] = await Promise.all([loadSurahs(), loadSurah(+id), loadRules(), getProgress(+id)]);
  const s = surahs.find((x) => x.id === +id);
  setLast(s.id, 'read');
  const done = !!progress.steps.read;

  // Бисмилля перед сурой (кроме аль-Фатихи, где она — первый аят, и ат-Тауба).
  let bismillah = null;
  if (s.id !== 1 && s.id !== 9) {
    const fatiha = await loadSurah(1);
    bismillah = h('p', { class: 'bismillah ar-text', lang: 'ar', dir: 'rtl' }, ayahText(fatiha.ayahs[0], rules, { tajweed: settings.showTajweed, marker: false }));
  }

  const root = h('div', { class: 'stack read' });
  const text = h('section', { class: 'read-text' });
  const apply = () => {
    root.style.setProperty('--ar-size', `${settings.arabicSize}px`);
    root.classList.toggle('no-translit', !settings.showTranslit);
    root.classList.toggle('no-translation', !settings.showTranslation);
    root.classList.toggle('no-tajweed', !settings.showTajweed);
  };
  const render = () => {
    text.replaceChildren(
      bismillah ? h('div', { class: 'bismillah-wrap' }, bismillah) : null,
      ...surah.ayahs.map((a) => h('article', { class: 'verse' },
        h('p', { class: 'ar-line', lang: 'ar', dir: 'rtl' }, ayahText(a, rules, { tajweed: settings.showTajweed })),
        h('p', { class: 'tr-line' }, a.tr),
        h('p', { class: 'ru-line' }, a.ru))),
    );
    apply();
  };

  const size = (delta) => () => { setSetting('arabicSize', settings.arabicSize + delta); label.textContent = `${settings.arabicSize}`; apply(); };
  const label = h('span', { class: 'size-val', 'aria-live': 'polite' }, `${settings.arabicSize}`);
  const used = new Set(surah.ayahs.flatMap((a) => a.tj.map((t) => t[2])));

  const panel = h('section', { class: 'tools' },
    h('div', { class: 'size-row' },
      h('b', {}, 'Размер'),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Уменьшить шрифт', onclick: size(-2) }, 'А−'),
        label,
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Увеличить шрифт', onclick: size(2) }, 'А+'))),
    h('details', { class: 'card options' },
      h('summary', {}, 'Что показывать'),
      toggle('Таджвид (цвета)', settings.showTajweed, (v) => { setSetting('showTajweed', v); render(); }),
      toggle('Транслитерация', settings.showTranslit, (v) => { setSetting('showTranslit', v); apply(); }),
      toggle('Перевод', settings.showTranslation, (v) => { setSetting('showTranslation', v); apply(); }),
      h('details', { class: 'legend-box' }, h('summary', {}, 'Обозначения цветов'), legend(rules, used))));

  root.append(
    subHeader(`#/surah/${s.id}`, s.ru, 'Читать'),
    panel, text,
    h('div', { class: 'action-bar' },
      h('button', { class: 'btn primary', type: 'button', onclick: async () => { await markStepDone(s.id, 'read'); go(`/surah/${s.id}`); } },
        done ? 'Вернуться к шагам' : 'Прочитано — дальше')));
  render();
  return root;
}
