// Локальное хранилище прогресса (IndexedDB). Всё хранится только на устройстве.
//
// Хранилища:
//   kv       — настройки и мелкие значения (ключ → значение)
//   progress — шаги обучения: ключ "s:<номер суры>" / "d:<id дуа>", значение { steps: {...}, ... }
//   cards    — карточки повторения (SM-2): ключ "s:<сура>:<аят>"
//   log      — журнал повторений и активности по дням
const DB_NAME = 'tartil';
const DB_VERSION = 1;
const STORES = ['kv', 'progress', 'cards', 'log'];

let dbPromise;
function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    t.oncomplete = () => resolve(result.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const db = {
  get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
  put: (store, key, value) => tx(store, 'readwrite', (s) => s.put(value, key)),
  delete: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
  async all(store) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const out = {};
      const req = d.transaction(store).objectStore(store).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  },
  STORES,
};
