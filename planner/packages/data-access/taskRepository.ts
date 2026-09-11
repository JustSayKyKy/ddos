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

/**
 * ВАЖНО: генерация экземпляров требует парсинга recurrence_rule ('DAILY' |
 * 'WEEKLY:MON,WED,FRI') — это бизнес-логика, а не CRUD. Согласно ТЗ
 * («без агрегаций и без бизнес-логики, только CRUD») я оставляю только
 * каркас: вставку строк-инстансов, которые уже вычислены на стороне
 * packages/core. См. [ЭСКАЛАЦИЯ #4].
 */
export async function generateUpcomingInstances(
  today: string, horizonDays = 14
): Promise<Task[]> {
  const db = await getDb();
  const templates = await db.select<Task[]>(
    `SELECT * FROM tasks WHERE is_recurring=1 AND recurrence_rule IS NOT NULL`
  );
  const created: Task[] = [];
  const now = new Date().toISOString();
  for (const tpl of templates) {
    // Генерация списка дат — вне CRUD-слоя. Здесь — только вставка.
    // Заглушка: ничего не генерирует без внешнего date-list.
    void tpl; void today; void horizonDays; void now;
  }
  return created;
}