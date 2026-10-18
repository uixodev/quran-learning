// Выравнивание двух вариантов написания одного и того же аята (посимвольно),
// чтобы перенести разметку таджвида на базовый текст.
//
// Текст таджвида (Quran.com) и базовый текст (Tanzil-стиль) отличаются
// только орфографией знаков (напр. «ـٰ» против «ىٰ», ْ против ۡ). Сопоставляем
// символы по «ключу» (одинаковые по смыслу знаки имеют один ключ) алгоритмом
// Needleman–Wunsch; несопоставленные символы получают пропуск.

const MARK = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/;

export function key(ch) {
  switch (ch) {
    case 'ـ': // татвиль
    case '‌': case '‍': case '​': case '‎': case '‏':
      return '';
    case 'ٱ': return 'ا';           // ٱ → ا
    case 'ٮ': case 'ى': case 'ی': case 'ي': return 'ي'; // ٮ ى ی ي
    case 'ْ': case 'ۡ': return 'ْ'; // сукун: ْ и ۡ
    // «Открытый» танвин в Tanzil-тексте (U+0657, U+065E, U+0656) и обычный — один и тот же знак.
    case 'ً': case 'ٗ': return 'ً';
    case 'ٌ': case 'ٞ': return 'ٌ';
    case 'ٍ': case 'ٖ': return 'ٍ';
    default: return ch;
  }
}

export const isMark = (ch) => MARK.test(ch);

/** Возвращает массив map: индекс символа в `from` → индекс в `to` либо -1. */
export function align(from, to) {
  const a = [...from], b = [...to];
  const ka = a.map(key), kb = b.map(key);
  const ia = [], ib = []; // индексы значимых (не пустой ключ) символов
  ka.forEach((k, i) => k && ia.push(i));
  kb.forEach((k, i) => k && ib.push(i));
  const n = ia.length, m = ib.length;
  const W = m + 1;
  const dp = new Int32Array((n + 1) * W);
  for (let i = 1; i <= n; i++) dp[i * W] = i;
  for (let j = 1; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = ka[ia[i - 1]] === kb[ib[j - 1]] ? dp[(i - 1) * W + j - 1] : Infinity;
      dp[i * W + j] = Math.min(sub, dp[(i - 1) * W + j] + 1, dp[i * W + j - 1] + 1);
    }
  }
  const map = new Array(a.length).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const eq = ka[ia[i - 1]] === kb[ib[j - 1]];
    if (eq && dp[i * W + j] === dp[(i - 1) * W + j - 1]) { map[ia[i - 1]] = ib[j - 1]; i--; j--; }
    else if (dp[i * W + j] === dp[(i - 1) * W + j] + 1) i--;
    else j--;
  }
  return { map, matched: map.filter((x) => x >= 0).length, total: n, baseTotal: m };
}
