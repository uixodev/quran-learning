import { h } from '../dom.js';
import { loadReciters } from '../data.js';
import { settings, setSetting } from '../settings.js';
import { exportProgress, importProgress } from '../backup.js';
import { subHeader, toggle } from '../ui.js';

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
  const { reciters } = await loadReciters();

  const preview = h('p', { class: 'ar-preview', lang: 'ar', dir: 'rtl', style: `font-size:${settings.arabicSize}px` }, 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
  const sizeVal = h('output', { class: 'size-val' }, `${settings.arabicSize}`);
  const slider = h('input', { type: 'range', min: 24, max: 56, step: 2, value: settings.arabicSize, 'aria-label': 'Размер арабского шрифта' });
  slider.addEventListener('input', () => {
    sizeVal.textContent = slider.value;
    preview.style.fontSize = `${slider.value}px`;
  });
  slider.addEventListener('change', () => setSetting('arabicSize', +slider.value));

  const reciter = h('select', { class: 'select', 'aria-label': 'Чтец' },
    reciters.map((r) => h('option', { value: r.id, selected: r.id === settings.reciter }, `${r.name} (${r.nameLat})`)));
  reciter.addEventListener('change', () => setSetting('reciter', reciter.value));

  const status = h('p', { class: 'status', role: 'status' });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    if (!confirm('Импорт заменит весь прогресс на этом устройстве данными из файла. Продолжить?')) return;
    try {
      const n = await importProgress(f);
      status.className = 'status ok';
      status.textContent = `Готово: загружено записей — ${n}. Откройте «Главная», чтобы увидеть прогресс.`;
    } catch (e) {
      status.className = 'status bad';
      status.textContent = e.message;
    }
  });

  return h('div', { class: 'stack' },
    subHeader('#/', 'Главная', 'Настройки'),
    h('section', { class: 'card' },
      h('h2', {}, 'Чтение'),
      preview,
      h('div', { class: 'size-row' }, h('b', {}, 'Размер арабского шрифта'), sizeVal),
      slider,
      toggle('Таджвид (цвета)', settings.showTajweed, (v) => setSetting('showTajweed', v)),
      toggle('Транслитерация', settings.showTranslit, (v) => setSetting('showTranslit', v), 'Латиницей, под арабским текстом'),
      toggle('Перевод', settings.showTranslation, (v) => setSetting('showTranslation', v), 'Эльмир Кулиев')),
    h('section', { class: 'card' },
      h('h2', {}, 'Чтец'),
      reciter,
      h('p', { class: 'muted small' }, 'Аудио появится на следующем этапе; выбор сохранится.')),
    h('section', { class: 'card' },
      h('h2', {}, 'Тема'),
      segmented('Тема', [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']], settings.theme, (v) => setSetting('theme', v))),
    h('section', { class: 'card' },
      h('h2', {}, 'Прогресс на устройстве'),
      h('p', { class: 'muted small' }, 'Всё хранится только на этом телефоне. Сохраните файл, чтобы перенести прогресс на другое устройство.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: async () => {
          try { const n = await exportProgress(); status.className = 'status ok'; status.textContent = `Файл сохранён (записей: ${n}).`; }
          catch (e) { status.className = 'status bad'; status.textContent = 'Не удалось сохранить файл.'; }
        } }, 'Сохранить в файл'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'Загрузить из файла')),
      fileInput, status),
    h('section', { class: 'card' },
      h('h2', {}, 'Загрузки аудио'),
      h('p', { class: 'muted small' }, 'Скачивание и удаление аудио по сурам появится на следующем этапе.')),
  );
}
