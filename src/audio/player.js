// Движок «Слушать и повторять».
//
// Режимы:
//   single — аят `cur` проигрывается `repeats` раз (0 = бесконечно); затем, если включено autoNext,
//            переходим к следующему аяту.
//   chain  — «цепочка»: аяты от `from` до `cur` подряд, весь круг повторяется `repeats` раз;
//            затем cur+1 — цепочка растёт (1, 1–2, 1–3, …).
// Событие "state": { playing, cur, active, rep, repeats, mode, loading }; событие "error": { message }.
import { resolvePlayable } from './store.js';

const GAP_BETWEEN_AYAHS = 120; // мс
const GAP_BETWEEN_ROUNDS = 650;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Player extends EventTarget {
  constructor() {
    super();
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.preservesPitch = true;
    this.audio.webkitPreservesPitch = true;
    this.cfg = { reciter: 'alafasy', surah: 1, count: 1, mode: 'single', repeats: 3, speed: 1, autoNext: true, from: 1 };
    this.cur = 1;
    this.items = [];
    this.i = 0;
    this.rep = 0;
    this.playing = false;
    this.loading = false;
    this.token = 0;
    this.objectUrl = null;
    this.audio.addEventListener('ended', () => this.#onEnded(this.token));
    this.audio.addEventListener('error', () => this.#onAudioError(this.token));
    this.meta = { title: () => '', artist: '', album: '' };
  }

  configure(patch) {
    Object.assign(this.cfg, patch);
    this.audio.playbackRate = this.audio.defaultPlaybackRate = this.cfg.speed;
    this.cur = Math.min(Math.max(1, this.cur), this.cfg.count);
    if (this.cfg.from > this.cur) this.cfg.from = this.cur;
    if (!this.playing) this.#emit();
  }

  get active() { return this.playing ? this.items[this.i] ?? this.cur : this.cur; }

  #emit() {
    this.dispatchEvent(new CustomEvent('state', {
      detail: { playing: this.playing, cur: this.cur, active: this.active, rep: this.rep, repeats: this.cfg.repeats, mode: this.cfg.mode, loading: this.loading },
    }));
  }

  #round() {
    if (this.cfg.mode === 'chain') {
      const from = Math.min(this.cfg.from, this.cur);
      return Array.from({ length: this.cur - from + 1 }, (_, k) => from + k);
    }
    return [this.cur];
  }

  /** Выбрать аят (без запуска, если на паузе; с перезапуском, если играет). */
  select(k) {
    this.cur = Math.min(Math.max(1, k), this.cfg.count);
    if (this.cfg.from > this.cur) this.cfg.from = this.cur;
    if (this.playing) this.#start(); else this.#emit();
  }
  next() { this.select(this.cur + 1); }
  prev() { this.select(this.cur - 1); }

  play() { this.#start(); }
  toggle() { this.playing ? this.pause() : this.play(); }

  pause() {
    this.token++;
    this.playing = false;
    this.loading = false;
    this.audio.pause();
    this.#setSession();
    this.#emit();
  }

  #start() {
    this.token++;
    this.items = this.#round();
    this.i = 0;
    this.rep = 0;
    this.playing = true;
    this.#playItem(this.token);
  }

  async #playItem(token) {
    if (token !== this.token) return;
    const ayah = this.items[this.i];
    this.loading = true;
    this.#emit();
    let src;
    try {
      src = await resolvePlayable(this.cfg.reciter, this.cfg.surah, ayah);
    } catch (e) { return this.#fail(token, 'Не удалось получить аудио.'); }
    if (token !== this.token) { if (src.revoke) URL.revokeObjectURL(src.url); return; }
    const old = this.objectUrl;
    this.objectUrl = src.revoke ? src.url : null;
    this.audio.src = src.url;
    this.audio.playbackRate = this.cfg.speed;
    try {
      await this.audio.play();
    } catch (e) {
      if (token !== this.token) return;
      return this.#fail(token, e.name === 'NotAllowedError' ? 'Нажмите ▶, чтобы начать воспроизведение.' : 'Не удалось воспроизвести аят.');
    } finally {
      if (old) URL.revokeObjectURL(old);
    }
    if (token !== this.token) return;
    this.loading = false;
    this.#setSession(ayah);
    this.#emit();
  }

  async #onEnded(token) {
    if (token !== this.token || !this.playing) return;
    if (this.i + 1 < this.items.length) {
      this.i++;
      await sleep(GAP_BETWEEN_AYAHS);
      return this.#playItem(token);
    }
    this.rep++;
    const { repeats, autoNext, count } = this.cfg;
    if (repeats === 0 || this.rep < repeats) {
      this.i = 0;
      this.#emit();
      await sleep(GAP_BETWEEN_ROUNDS);
      return this.#playItem(token);
    }
    if (autoNext && this.cur < count) {
      this.cur++;
      this.items = this.#round();
      this.i = 0;
      this.rep = 0;
      this.#emit();
      await sleep(GAP_BETWEEN_ROUNDS);
      return this.#playItem(token);
    }
    this.playing = false;
    this.rep = 0;
    this.#setSession();
    this.#emit();
    this.dispatchEvent(new CustomEvent('finished'));
  }

  #onAudioError(token) {
    if (token !== this.token || !this.playing) return;
    this.#fail(token, navigator.onLine === false
      ? 'Нет сети, а этот аят не скачан. Скачайте аудио суры, пока есть интернет.'
      : 'Не удалось загрузить аудио. Проверьте интернет и попробуйте ещё раз.');
  }

  #fail(token, message) {
    if (token !== this.token) return;
    this.token++;
    this.playing = false;
    this.loading = false;
    this.audio.pause();
    this.#emit();
    this.dispatchEvent(new CustomEvent('error', { detail: { message } }));
  }

  // Экран блокировки / наушники.
  #setSession(ayah = this.cur) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: this.meta.title(ayah), artist: this.meta.artist, album: this.meta.album });
      navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
      for (const [action, fn] of [['play', () => this.play()], ['pause', () => this.pause()], ['nexttrack', () => this.next()], ['previoustrack', () => this.prev()]]) {
        navigator.mediaSession.setActionHandler(action, fn);
      }
    } catch {}
  }

  destroy() {
    this.token++;
    this.playing = false;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    if ('mediaSession' in navigator) {
      try { for (const a of ['play', 'pause', 'nexttrack', 'previoustrack']) navigator.mediaSession.setActionHandler(a, null); navigator.mediaSession.metadata = null; } catch {}
    }
  }
}
