// Пять шагов изучения суры (и дуа). `ready: false` — шаг ещё не реализован, в пути показывается как «скоро».
export const STEPS = [
  { id: 'understand', n: 1, title: 'Понять', hint: 'Смысл каждого аята', ready: true },
  { id: 'read', n: 2, title: 'Читать', hint: 'Арабский текст с таджвидом', ready: true },
  { id: 'listen', n: 3, title: 'Слушать и повторять', hint: 'Чтец, повтор, цепочки аятов', ready: false },
  { id: 'memorize', n: 4, title: 'Запомнить', hint: 'Слова постепенно скрываются', ready: false },
  { id: 'review', n: 5, title: 'Повторение', hint: 'Интервальные карточки', ready: false },
];

export const stepById = (id) => STEPS.find((s) => s.id === id);

/** Состояние шага: done | current | todo. Текущий — первый непройденный. */
export function stepStates(progress) {
  const done = progress?.steps ?? {};
  let currentSet = false;
  return STEPS.map((s) => {
    if (done[s.id]) return { ...s, state: 'done' };
    if (!currentSet) { currentSet = true; return { ...s, state: 'current' }; }
    return { ...s, state: 'todo' };
  });
}

export const stepsDone = (progress) => STEPS.filter((s) => progress?.steps?.[s.id]).length;
