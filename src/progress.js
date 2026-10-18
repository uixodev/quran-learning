// Прогресс обучения. Хранится в IndexedDB (хранилища progress, log, kv).
//   progress["s:<сура>"] = { steps: { understand: <время>, read: <время>, ... } }
//   kv["last"]           = { kind: "s", id, step }   — где остановились («Продолжить»)
//   log["day:YYYY-MM-DD"] = { steps: n }             — активность по дням (для серии)
import { db } from './db.js';
import { STEPS } from './steps.js';

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getProgress = async (id) => (await db.get('progress', `s:${id}`)) ?? { steps: {} };
export const getAllProgress = () => db.all('progress');

export async function setLast(id, step) {
  await db.put('kv', 'last', { kind: 's', id, step });
}
export const getLast = () => db.get('kv', 'last');

/** Отмечает шаг пройденным и записывает активность за сегодня. */
export async function markStepDone(id, step) {
  const p = await getProgress(id);
  const first = !p.steps[step];
  p.steps[step] = p.steps[step] ?? Date.now();
  await db.put('progress', `s:${id}`, p);
  if (first) {
    const key = `day:${dayKey()}`;
    const day = (await db.get('log', key)) ?? { steps: 0 };
    day.steps += 1;
    await db.put('log', key, day);
  }
  const next = STEPS.find((s) => s.ready && !p.steps[s.id]);
  await setLast(id, next?.id ?? step);
  return p;
}

export async function resetStep(id, step) {
  const p = await getProgress(id);
  delete p.steps[step];
  await db.put('progress', `s:${id}`, p);
}
