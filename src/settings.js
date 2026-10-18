import { db } from './db.js';

export const DEFAULTS = {
  theme: 'auto',        // auto | light | dark
  arabicSize: 34,       // px
  showTranslit: true,
  showTranslation: true,
  showTajweed: true,
  reciter: 'alafasy',
};

const state = { ...DEFAULTS };
const listeners = new Set();

export const settings = state;
export const onSettings = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export function applyTheme() {
  const root = document.documentElement;
  if (state.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = state.theme;
  try { localStorage.setItem('tartil.theme', state.theme); } catch {}
  // Цвет системной панели браузера.
  const dark = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const m = document.createElement('meta');
  m.name = 'theme-color';
  m.content = dark ? '#0B1220' : '#FAF6EC';
  document.head.append(m);
}

export async function loadSettings() {
  try {
    Object.assign(state, (await db.get('kv', 'settings')) ?? {});
  } catch (e) {
    console.warn('Не удалось прочитать настройки', e);
  }
  applyTheme();
}

export async function setSetting(key, value) {
  if (key === 'arabicSize') value = Math.min(56, Math.max(24, Math.round(value)));
  state[key] = value;
  if (key === 'theme') applyTheme();
  listeners.forEach((fn) => fn(key, value));
  try { await db.put('kv', 'settings', { ...state }); } catch (e) { console.warn('Не удалось сохранить настройки', e); }
}

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => state.theme === 'auto' && applyTheme());
