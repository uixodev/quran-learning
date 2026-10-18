import { h, icon } from '../dom.js';
import { loadRules, loadSurah, loadSurahs } from '../data.js';
import { ayahText } from '../tajweed.js';
import { markStepDone, getProgress, setLast } from '../progress.js';
import { settings, setSetting } from '../settings.js';
import { go } from '../router.js';
import { subHeader } from '../ui.js';
import { Player } from '../audio/player.js';
import { reciterInfo } from '../audio/sources.js';
import { downloadControls } from './downloads.js';

const PLAY = '<path d="M8 5.5v13l11-6.500z" fill="currentColor" stroke="none"/>';
const PAUSE = '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>';
const PREV = '<path d="M6 5v14M19 5.500v13L9 12z" />';
const NEXT = '<path d="M18 5v14M5 5.500v13L15 12z" />';
const REPEATS = [[1, '1'], [3, '3'], [5, '5'], [10, '10'], [0, '∞']];
const SPEEDS = [[0.75, '0,75×'], [0.85, '0,85×'], [1, '1×']];

function chips(label, options, value, onPick) {
  const row = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': label },
    h('span', { class: 'chips-label' }, label),
    options.map(([v, text]) => h('button', {
      type: 'button', role: 'radio', class: `chip${v === value ? ' on' : ''}`, 'aria-checked': String(v === value),
      onclick: (e) => {
        row.querySelectorAll('.chip').forEach((b) => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); });
        onPick(v);
      },
    }, text)));
  return row;
}

export async function listenView({ id }) {
  const [surahs, surah, rules, progress] = await Promise.all([loadSurahs(), loadSurah(+id), loadRules(), getProgress(+id)]);
  const s = surahs.find((x) => x.id === +id);
  setLast(s.id, 'listen');
  const reciter = await reciterInfo(settings.reciter);
  const done = !!progress.steps.listen;

  const player = new Player();
  window.__tartilPlayer = player; // для автотестов
  player.meta = { title: (a) => `${s.ru} · аят ${a}`, artist: reciter.nameLat, album: 'Тартиль' };
  const cfg = () => ({
    reciter: reciter.id, surah: s.id, count: s.ayahs, mode: settings.listenMode, repeats: settings.listenRepeats,
    speed: settings.listenSpeed, autoNext: settings.listenAutoNext,
  });
  player.configure(cfg());

  const root = h('div', { class: 'stack listen' });
  const msg = h('p', { class: 'status bad', role: 'alert', hidden: true });

  // Список аятов («как в песнях»): текущий подсвечен, остальные приглушены.
  const verses = surah.ayahs.map((a) => {
    const el = h('article', { class: 'verse tap', tabindex: 0, role: 'button', 'aria-label': `Аят ${a.n}. Воспроизвести с этого аята`, dataset: { n: a.n } },
      h('p', { class: 'ar-line', lang: 'ar', dir: 'rtl' }, ayahText(a, rules, { tajweed: settings.showTajweed })),
      h('p', { class: 'ru-line' }, a.ru));
    const pick = () => { player.select(a.n); player.play(); };
    el.addEventListener('click', pick);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    return el;
  });
  const list = h('section', { class: 'read-text lyric' }, verses);

  // Режим фокуса: один аят по центру.
  const focusNum = h('span', { class: 'badge big' });
  const focusAr = h('p', { class: 'focus-ar', lang: 'ar', dir: 'rtl' });
  const focusRu = h('p', { class: 'focus-ru' });
  const focusBox = h('section', { class: 'focus', 'aria-live': 'polite' }, focusNum, focusAr, focusRu);
  let touchX = null;
  focusBox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  focusBox.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 60) { dx < 0 ? player.next() : player.prev(); } // свайп влево — дальше
  });
  const renderFocus = (n) => {
    const a = surah.ayahs[n - 1];
    focusNum.textContent = n;
    focusAr.replaceChildren(ayahText(a, rules, { tajweed: settings.showTajweed, marker: false }));
    focusRu.textContent = settings.showTranslation ? a.ru : '';
  };

  // Плеер (прижат к низу над навигацией).
  const ctr = h('span', { class: 'counter', 'aria-live': 'polite' });
  const playBtn = h('button', { type: 'button', class: 'play-btn', 'aria-label': 'Воспроизвести', onclick: () => player.toggle() }, icon(PLAY, 34));
  const prevBtn = h('button', { type: 'button', class: 'ctl', 'aria-label': 'Предыдущий аят', onclick: () => player.prev() }, icon(PREV, 28));
  const nextBtn = h('button', { type: 'button', class: 'ctl', 'aria-label': 'Следующий аят', onclick: () => player.next() }, icon(NEXT, 28));
  const summary = h('button', { type: 'button', class: 'tune-btn', 'aria-expanded': 'false' });
  const fromVal = h('output', { class: 'size-val' }, '1');
  const fromRow = h('div', { class: 'chips from-row' },
    h('span', { class: 'chips-label' }, 'Цепочка с аята'),
    h('button', { type: 'button', class: 'chip', 'aria-label': 'Начать цепочку раньше', onclick: () => setFrom(player.cfg.from - 1) }, '−'),
    fromVal,
    h('button', { type: 'button', class: 'chip', 'aria-label': 'Начать цепочку позже', onclick: () => setFrom(player.cfg.from + 1) }, '+'));
  function setFrom(v) { player.cfg.from = Math.min(Math.max(1, v), player.cur); fromVal.textContent = player.cfg.from; }

  const tune = h('div', { class: 'tune', hidden: true },
    chips('Режим', [['single', 'Один аят'], ['chain', 'Цепочка']], settings.listenMode, (v) => { setSetting('listenMode', v); player.configure({ mode: v }); syncTune(); if (player.playing) player.select(player.cur); }),
    fromRow,
    chips('Повторов', REPEATS, settings.listenRepeats, (v) => { setSetting('listenRepeats', v); player.configure({ repeats: v }); syncSummary(); }),
    chips('Скорость', SPEEDS, settings.listenSpeed, (v) => { setSetting('listenSpeed', v); player.configure({ speed: v }); syncSummary(); }),
    chips('Потом', [[true, 'Дальше'], [false, 'Стоп']], settings.listenAutoNext, (v) => { setSetting('listenAutoNext', v); player.configure({ autoNext: v }); }),
  );
  function syncTune() { fromRow.hidden = settings.listenMode !== 'chain'; fromVal.textContent = player.cfg.from; }
  function syncSummary() {
    const r = settings.listenRepeats === 0 ? '∞' : `×${settings.listenRepeats}`;
    summary.textContent = `${settings.listenMode === 'chain' ? '⛓ ' : ''}${r} · ${String(settings.listenSpeed).replace('.', ',')}× ▾`;
    summary.setAttribute('aria-label', `Настройки повторения: ${settings.listenMode === 'chain' ? 'цепочка' : 'один аят'}, повторов ${r}, скорость ${settings.listenSpeed}`);
  }
  summary.addEventListener('click', () => {
    const open = tune.hidden;
    tune.hidden = !open; summary.setAttribute('aria-expanded', String(open));
    root.classList.toggle('tune-open', open);
  });

  const bar = h('div', { class: 'player', role: 'region', 'aria-label': 'Плеер' },
    tune,
    h('div', { class: 'player-top' }, ctr, summary),
    h('div', { class: 'player-ctl' }, prevBtn, playBtn, nextBtn));

  let lastActive = 0;
  const onState = (e) => {
    const { playing, active, cur, rep, repeats, loading } = e.detail;
    playBtn.replaceChildren(icon(playing ? PAUSE : PLAY, 34));
    playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
    playBtn.classList.toggle('loading', loading);
    const total = s.ayahs;
    const repText = playing ? ` · повтор ${Math.min(rep + 1, repeats || rep + 1)}${repeats ? `/${repeats}` : ''}` : '';
    ctr.textContent = `Аят ${cur}/${total}${repText}`;
    if (playing) root.classList.remove('finished');
    prevBtn.disabled = cur <= 1; nextBtn.disabled = cur >= total;
    verses.forEach((el, i) => {
      const on = i + 1 === active;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
    });
    if (active !== lastActive) {
      lastActive = active;
      verses[active - 1]?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      renderFocus(active);
    }
    if (fromRow && settings.listenMode === 'chain') fromVal.textContent = player.cfg.from;
    msg.hidden = true;
  };
  player.addEventListener('state', onState);
  player.addEventListener('error', (e) => { msg.textContent = e.detail.message; msg.hidden = false; });
  player.addEventListener('finished', () => { root.classList.add('finished'); });

  const focusBtn = h('button', { type: 'button', class: 'btn small', 'aria-pressed': String(settings.listenFocus), onclick: (e) => {
    const on = !root.classList.contains('focus-mode');
    root.classList.toggle('focus-mode', on); e.currentTarget.setAttribute('aria-pressed', String(on)); setSetting('listenFocus', on);
    verses[player.active - 1]?.scrollIntoView({ block: 'center' });
  } }, 'Режим фокуса');

  const dl = downloadControls(s, reciter.id);
  root.append(
    subHeader(`#/surah/${s.id}`, s.ru, 'Слушать и повторять', `Чтец: ${reciter.name}`),
    h('section', { class: 'card' }, dl, h('div', { class: 'btn-row' }, focusBtn)),
    msg,
    list, focusBox,
    h('div', { class: 'action-bar' },
      h('button', { class: 'btn primary', type: 'button', onclick: async () => { await markStepDone(s.id, 'listen'); go(`/surah/${s.id}`); } },
        done ? 'Вернуться к шагам' : 'Готово — дальше')),
    bar);

  root.classList.toggle('focus-mode', settings.listenFocus);
  syncTune(); syncSummary(); onState({ detail: { playing: false, active: 1, cur: 1, rep: 0, repeats: settings.listenRepeats, loading: false } });
  // Остановить звук при уходе с экрана.
  root.__cleanup = () => { player.destroy(); dl.__cleanup?.(); };
  return root;
}
