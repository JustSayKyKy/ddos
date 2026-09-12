import { getDb } from './db';
import type { Task, NewTaskInput, TaskStatus, DayFocus } from '@shared/types';

export async function getTasksForDay(date: string): Promise<Task[]> {
  const db = await getDb();
  return db.select<Task[]>(
    `SELECT * FROM tasks WHERE scope='daily' AND due_date=? ORDER BY id`,
    [date]
  );
}

export async function getWeeklyTasks(weekStartDate: string): Promise<Task[]> {
  const db = await getDb();
  return db.select<Task[]>(
    `SELECT * FROM tasks WHERE scope='weekly' AND week_start_date=? ORDER BY id`,
    [weekStartDate]
  );
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();
  const res = await db.execute(
    `INSERT INTO tasks
      (title, description, category_id, goal_id, priority, status, scope,
       due_date, week_start_date, is_recurring, recurrence_rule,
       parent_task_id, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, ?, ?)`,
    [
      input.title, input.description ?? null, input.category_id ?? null,
      input.goal_id ?? null, input.priority ?? 'normal', input.status ?? 'open',
      input.scope, input.due_date ?? null, input.week_start_date ?? null,
      input.recurrence_rule ?? null, now, now,
    ]
  );
  const rows = await db.select<Task[]>(`SELECT * FROM tasks WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  const db = await getDb();
  const completedAt = status === 'done' ? new Date().toISOString() : null;
  await db.execute(
    `UPDATE tasks SET status=?, completed_at=?, updated_at=? WHERE id=?`,
    [status, completedAt, new Date().toISOString(), id]
  );
  const rows = await db.select<Task[]>(`SELECT * FROM tasks WHERE id=?`, [id]);
  return rows[0];
}

export async function updateTask(id: number, patch: Partial<NewTaskInput>): Promise<Task> {
  const db = await getDb();
  const cols: string[] = []; const vals: unknown[] = [];
  const map: Record<string, unknown> = {
    title: patch.title, description: patch.description, category_id: patch.category_id,
    goal_id: patch.goal_id, priority: patch.priority, status: patch.status,
    scope: patch.scope, due_date: patch.due_date, week_start_date: patch.week_start_date,
    recurrence_rule: patch.recurrence_rule,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { cols.push(`${k}=?`); vals.push(v); }
  }
  cols.push('updated_at=?'); vals.push(new Date().toISOString());
  vals.push(id);
  await db.execute(`UPDATE tasks SET ${cols.join(', ')} WHERE id=?`, vals);
  const rows = await db.select<Task[]>(`SELECT * FROM tasks WHERE id=?`, [id]);
  return rows[0];
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM tasks WHERE id=?`, [id]);
}

export async function getOverdueTasks(today: string): Promise<Task[]> {
  const db = await getDb();
  return db.select<Task[]>(
    `SELECT * FROM tasks
      WHERE scope='daily' AND due_date < ? AND status='open'
      ORDER BY due_date`,
    [today]
  );
}

export async function getDayFocus(date: string): Promise<DayFocus | null> {
  const db = await getDb();
  const rows = await db.select<DayFocus[]>(`SELECT * FROM day_focus WHERE day_date=?`, [date]);
  return rows[0] ?? null;
}

export async function setDayFocusTask(date: string, taskId: number | null): Promise<DayFocus> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO day_focus (day_date, focus_task_id) VALUES (?, ?)
     ON CONFLICT(day_date) DO UPDATE SET focus_task_id=excluded.focus_task_id`,
    [date, taskId]
  );
  const rows = await db.select<DayFocus[]>(`SELECT * FROM day_focus WHERE day_date=?`, [date]);
  return rows[0];
}

export async function updateDayNotes(date: string, notes: string): Promise<DayFocus> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO day_focus (day_date, notes) VALUES (?, ?)
     ON CONFLICT(day_date) DO UPDATE SET notes=excluded.notes`,
    [date, notes]
  );
  const rows = await db.select<DayFocus[]>(`SELECT * FROM day_focus WHERE day_date=?`, [date]);
  return rows[0];
}

export async function createRecurringTemplate(
  input: NewTaskInput & { recurrence_rule: string }
): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();
  const res = await db.execute(
    `INSERT INTO tasks
      (title, description, category_id, goal_id, priority, status, scope,
       due_date, week_start_date, is_recurring, recurrence_rule,
       parent_task_id, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, 1, ?, NULL, NULL, ?, ?)`,
    [
      input.title, input.description ?? null, input.category_id ?? null,
      input.goal_id ?? null, input.priority ?? 'normal', input.scope,
      input.due_date ?? null, input.week_start_date ?? null,
      input.recurrence_rule, now, now,
    ]
  );
  const rows = await db.select<Task[]>(`SELECT * FROM tasks WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

import { getUpcomingDates } from '../core/recurrence';

/**
 * ВНУТРЕННИЙ метод. Не экспортируется из пакета (не попадает в index.ts).
 * Используется только generateUpcomingInstances. parent_task_id намеренно
 * не выведен в NewTaskInput (см. ответ Claude на [ЭСКАЛАЦИЯ #6]).
 */
async function _insertInstance(
  parentTaskId: number,
  fields: {
    title: string;
    description: string | null;
    category_id: number | null;
    goal_id: number | null;
    priority: 'low' | 'normal' | 'high';
    scope: 'daily' | 'weekly';
    due_date: string | null;
    week_start_date: string | null;
    recurrence_rule: string | null;
  }
): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();
  const res = await db.execute(
    `INSERT INTO tasks
      (title, description, category_id, goal_id, priority, status, scope,
       due_date, week_start_date, is_recurring, recurrence_rule,
       parent_task_id, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, 0, ?, ?, NULL, ?, ?)`,
    [
      fields.title, fields.description, fields.category_id, fields.goal_id,
      fields.priority, fields.scope, fields.due_date, fields.week_start_date,
      fields.recurrence_rule, parentTaskId, now, now,
    ]
  );
  const rows = await db.select<Task[]>(`SELECT * FROM tasks WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

const DEFAULT_HORIZON_DAYS = 14;

async function _readHorizonDaysFromSettings(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM app_settings WHERE key='recurring_horizon_days'`
  );
  const raw = rows[0]?.value;
  if (raw == null) return DEFAULT_HORIZON_DAYS;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_HORIZON_DAYS;
}

/**
 * Публичный контракт (API_CONTRACTS.md §1).
 *  1. horizonDays — из аргумента, иначе из app_settings.recurring_horizon_days,
 *     иначе 14.
 *  2. Для каждого шаблона (is_recurring=1, recurrence_rule NOT NULL) —
 *     getUpcomingDates(rule, today, horizonDays) из packages/core/recurrence.ts.
 *  3. Вставка через _insertInstance с parent_task_id = tpl.id.
 *  4. Идемпотентность: не создаём дубликат, если на ту же (parent_task_id, due_date)
 *     уже есть экземпляр.
 *
 * due_date экземпляра = конкретная дата из окна. scope копируется с шаблона;
 * для 'weekly' дополнительно проставляем week_start_date = понедельник этой даты.
 */
export async function generateUpcomingInstances(
  today: string,
  horizonDays?: number
): Promise<Task[]> {
  const db = await getDb();
  const horizon = horizonDays ?? (await _readHorizonDaysFromSettings());

  const templates = await db.select<Task[]>(
    `SELECT * FROM tasks
      WHERE is_recurring=1 AND recurrence_rule IS NOT NULL`
  );

  const created: Task[] = [];
  for (const tpl of templates) {
    const dates = getUpcomingDates(tpl.recurrence_rule, today, horizon);
    for (const date of dates) {
      // идемпотентность
      const existing = await db.select<{ id: number }[]>(
        `SELECT id FROM tasks
          WHERE parent_task_id=? AND (
            (? IS NOT NULL AND due_date=?) OR
            (? IS NOT NULL AND week_start_date=?)
          )`,
        [tpl.id, date, date, date, date]
      );
      if (existing.length > 0) continue;

      const isWeekly = tpl.scope === 'weekly';
      const inst = await _insertInstance(tpl.id, {
        title: tpl.title,
        description: tpl.description,
        category_id: tpl.category_id,
        goal_id: tpl.goal_id,
        priority: tpl.priority,
        scope: tpl.scope,
        due_date: isWeekly ? null : date,
        week_start_date: isWeekly ? mondayOf(date) : null,
        recurrence_rule: null, // у экземпляра правило пустое — он не шаблон
      });
      created.push(inst);
    }
  }
  return created;
}

/** Понедельник недели, в которую попадает дата (ISO YYYY-MM-DD). */
function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();          // 0=Sun..6=Sat
  const delta = (dow + 6) % 7;          // 0 для Mon, 6 для Sun
  dt.setUTCDate(dt.getUTCDate() - delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}