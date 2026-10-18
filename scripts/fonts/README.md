# Шрифты

Лежат в `src/fonts/`, подключаются локально (работают офлайн). Обе лицензии — SIL OFL 1.1.

- `amiri-quran.woff2` — Amiri Quran 1.003 (google/fonts, `ofl/amiriquran/AmiriQuran-Regular.ttf`),
  подмножество «арабский» (U+0600–06FF, U+0750–077F, U+08A0–08FF, U+FB50–FDFF, U+FE70–FEFF).
  Готовый набор `@fontsource/amiri-quran` не подходит: в нём нет U+08F0–08F2 (открытый танвин).
  Команда:
  `pyftsubset AmiriQuran-Regular.ttf --unicodes="U+0020,U+00A0,U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF,U+25CC" --layout-features='*' --flavor=woff2 --output-file=amiri-quran.woff2`
- `inter-cyrillic.woff2`, `inter-latin.woff2` — Inter (variable), из npm `@fontsource-variable/inter` 5.2.8.
