/**
 * Чистый парсер recurrence_rule. Без I/O, без БД, без Tauri.
 * Полностью юнит-тестируемо.
 *
 * Поддерживаемые форматы (по DATABASE.md §2):
 *   'DAILY'                 — каждый день
 *   'WEEKLY:MON,WED,FRI'    — конкретные дни недели
 *   null / '' / undefined   — не повторяющаяся задача → []
 *
 * Горизонт: today — ISO YYYY-MM-DD, horizonDays — целое >= 0.
 * Возвращает массив ISO-дат YYYY-MM-DD, начиная с today (включительно),
 * длиной не больше horizonDays, в порядке возрастания.
 */

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

const WEEKDAY_INDEX: Record<Weekday, number> = {
  // JS Date.getDay(): 0=Sun..6=Sat
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const ALL_WEEKDAYS: Weekday[] = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

export class RecurrenceRuleError extends Error {
  constructor(public readonly rule: string, message: string) {
    super(`Invalid recurrence_rule "${rule}": ${message}`);
    this.name = 'RecurrenceRuleError';
  }
}

function assertIsoDate(d: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new RecurrenceRuleError(d, `${label} must be YYYY-MM-DD`);
  }
}

function parseRule(rule: string): { kind: 'daily' } | { kind: 'weekly'; days: Weekday[] } {
  const trimmed = rule.trim().toUpperCase();
  if (trimmed === 'DAILY') return { kind: 'daily' };

  const m = /^WEEKLY:([A-Z,]+)$/.exec(trimmed);
  if (m) {
    const parts = m[1].split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) throw new RecurrenceRuleError(rule, 'WEEKLY: needs at least one weekday');
    const days: Weekday[] = [];
    for (const p of parts) {
      if (!(p in WEEKDAY_INDEX)) {
        throw new RecurrenceRuleError(rule, `unknown weekday "${p}"`);
      }
      days.push(p as Weekday);
    }
    // дедупликация с сохранением порядка
    const uniq = Array.from(new Set(days));
    return { kind: 'weekly', days: uniq };
  }

  throw new RecurrenceRuleError(rule, 'expected DAILY or WEEKLY:MON,WED,FRI');
}

function addDaysIso(iso: string, days: number): string {
  // Работаем в UTC, чтобы избежать TZ-скачков на границе суток.
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Основная функция. Возвращает список дат (ISO, YYYY-MM-DD), на которые
 * нужно сгенерировать экземпляры recurring-задачи.
 *
 * Контракт:
 *  - today включительно (если подходит под правило)
 *  - ровно horizonDays дат максимум; если правило реже — меньше
 *  - порядок возрастания
 *  - дубликаты исключены (для WEEKLY с уникальными днями они и так невозможны)
 *  - невалидный rule → RecurrenceRuleError (репозиторий не должен молча глотать)
 *  - null/undefined/'' → [] (не повторяющаяся)
 */
export function getUpcomingDates(
  rule: string | null | undefined,
  today: string,
  horizonDays: number
): string[] {
  if (rule == null || rule === '') return [];
  assertIsoDate(today, 'today');
  if (!Number.isInteger(horizonDays) || horizonDays < 0) {
    throw new Error(`horizonDays must be a non-negative integer, got ${horizonDays}`);
  }
  if (horizonDays === 0) return [];

  const parsed = parseRule(rule);
  const out: string[] = [];
  // Сканируем последовательно day by day — horizonDays по умолчанию 14,
  // это копейки по CPU, зато нет арифметики «N-е совпадение дня недели».
  for (let i = 0; i < horizonDays; i++) {
    const iso = i === 0 ? today : addDaysIso(today, i);
    if (parsed.kind === 'daily') {
      out.push(iso);
    } else {
      const wd = new Date(iso + 'T00:00:00Z').getUTCDay();
      const wanted = parsed.days.some(d => WEEKDAY_INDEX[d] === wd);
      if (wanted) out.push(iso);
    }
  }
  return out;
}

export { ALL_WEEKDAYS };