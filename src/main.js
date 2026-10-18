import './styles.css';
import { loadSettings } from './settings.js';
import { mountRouter, route } from './router.js';
import { homeView } from './views/home.js';
import { placeholderView } from './views/placeholder.js';
import { settingsView } from './views/settings.js';

route('/', homeView, { tab: '/' });
route('/surahs', placeholderView('Суры', 'Список сур появится на следующем этапе.'), { tab: '/surahs' });
route('/duas', placeholderView('Дуа', 'Раздел дуа появится позже.'), { tab: '/duas' });
route('/review', placeholderView('Повторение', 'Здесь будут карточки для повторения.'), { tab: '/review' });
route('/progress', placeholderView('Прогресс', 'Здесь будет ваш прогресс.'), { tab: '/progress' });
route('/settings', settingsView, { tab: '/' });

(async () => {
  await loadSettings();
  await mountRouter(document.getElementById('app'));
})();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => console.warn('SW не зарегистрирован', e));
  });
}
