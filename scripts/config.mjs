// Единый список источников и сур. Версии зафиксированы, чтобы данные
// собирались одинаково при каждом запуске.
export const SOURCES = {
  quranJson: { npm: 'quran-json@3.1.2' },
  tajweed: { npm: 'react-native-quran-tajweed@0.1.3' },
  // Независимая копия Tanzil — только для сверки (verify-data.mjs).
  fawaz: {
    base: 'https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions',
    files: ['rus-elmirkuliev.json', 'ara-quran-la.json'],
  },
  // Второй независимый арабский текст (QUL / Tarteel) — только для сверки.
  qul: { npm: 'quran-validator@1.3.0' },
};

// Какие суры собирать. Для всех 114 запустите: node scripts/build-data.mjs --all
export const SURAHS_DEFAULT = [1, ...Array.from({ length: 37 }, (_, i) => 78 + i)];
export const SURAHS_ALL = Array.from({ length: 114 }, (_, i) => i + 1);

// Правила таджвида (в порядке, в котором они пишутся в data/tajweed-rules.json).
// Ключ — имя правила в источнике; tafkhim/tarqiq не окрашиваем.
export const SKIP_RULES = new Set(['tafkhim', 'tarqiq']);
