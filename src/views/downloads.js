import { h } from '../dom.js';
import { cachedAyahs, bytesMeta, cancelDownload, deleteSurahAudio, formatBytes, getJob, startDownload, subscribeDownloads } from '../audio/store.js';

/**
 * Блок скачивания аудио суры: кнопка, прогресс, отмена, удаление.
 * `compact` — для списка в настройках. Возвращает элемент с __cleanup (отписка).
 */
export function downloadControls(surah, reciterId, { compact = false, onChange } = {}) {
  const box = h('div', { class: `dl ${compact ? 'compact' : ''}` });
  let alive = true;

  async function render() {
    if (!alive) return;
    const job = getJob(reciterId, surah.id);
    const have = await cachedAyahs(reciterId, surah.id);
    if (!alive) return;
    const full = have.size >= surah.ayahs;
    const bytes = full ? await bytesMeta(reciterId, surah.id) : null;
    const kids = [];

    if (job?.state === 'running') {
      const pct = job.total ? Math.round((100 * job.done) / job.total) : 0;
      kids.push(
        h('div', { class: 'dl-line' },
          h('span', {}, `Скачивание: ${job.done} из ${job.total}${job.bytes ? ` · ${formatBytes(job.bytes)}` : ''}`),
          h('button', { class: 'link', type: 'button', onclick: () => cancelDownload(reciterId, surah.id) }, 'Отмена')),
        h('span', { class: 'bar big', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('span', { style: `width:${pct}%` })));
    } else if (full) {
      kids.push(h('div', { class: 'dl-line' },
        h('span', { class: 'ok' }, `✓ Аудио сохранено${bytes ? ` (${formatBytes(bytes)})` : ''}`),
        h('button', { class: 'link', type: 'button', onclick: async () => { await deleteSurahAudio(reciterId, surah.id); render(); onChange?.(); } }, 'Удалить')));
    } else {
      const partial = have.size ? ` Сохранено ${have.size} из ${surah.ayahs}.` : '';
      if (job?.state === 'error') kids.push(h('p', { class: 'status bad', role: 'alert' }, `Не всё удалось скачать (${job.failed} аят.). ${job.error ? `Причина: ${job.error}. ` : ''}Слушать онлайн можно и без скачивания. Можно повторить позже.`));
      kids.push(h('div', { class: 'dl-line' },
        h('span', { class: 'muted' }, compact ? (have.size ? `Сохранено ${have.size} из ${surah.ayahs}` : 'Не скачано') : `Без скачивания аудио играет только при интернете.${partial}`),
        h('button', { class: compact ? 'btn small' : 'btn', type: 'button', onclick: () => startDownload(reciterId, surah.id, surah.ayahs) }, have.size ? 'Докачать' : 'Скачать для офлайна')));
    }
    box.replaceChildren(...kids);
  }

  const unsub = subscribeDownloads(() => { render().then(() => { const j = getJob(reciterId, surah.id); if (j && j.state !== 'running') onChange?.(); }); });
  box.__cleanup = () => { alive = false; unsub(); };
  render();
  return box;
}
