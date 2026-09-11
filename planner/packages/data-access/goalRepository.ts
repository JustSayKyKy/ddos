import { getDb } from './db';
import type {
  Goal, NewGoalInput, GoalStatus, Task, GoalLog, NewGoalLogInput,
} from '@shared/types';

export async function getGoals(status?: GoalStatus): Promise<Goal[]> {
  const db = await getDb();
  if (status) {
    return db.select<Goal[]>(`SELECT * FROM goals WHERE status=? ORDER BY id`, [status]);
  }
  return db.select<Goal[]>(`SELECT * FROM goals ORDER BY id`);
}

export async function createGoal(input: NewGoalInput): Promise<Goal> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO goals
      (title, description, target_date, progress_type, target_count,
       unit_label, quick_add_tag, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      input.title, input.description ?? null, input.target_date ?? null,
      input.progress_type ?? 'linked_tasks', input.target_count ?? null,
      input.unit_label ?? null, input.quick_add_tag ?? null,
      new Date().toISOString(),
    ]
  );
  const rows = await db.select<Goal[]>(`SELECT * FROM goals WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function updateGoal(id: number, patch: Partial<NewGoalInput>): Promise<Goal> {
  const db = await getDb();
  const cols: string[] = []; const vals: unknown[] = [];
  const map: Record<string, unknown> = {
    title: patch.title, description: patch.description, target_date: patch.target_date,
    progress_type: patch.progress_type, target_count: patch.target_count,
    unit_label: patch.unit_label, quick_add_tag: patch.quick_add_tag,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { cols.push(`${k}=?`); vals.push(v); }
  }
  if (cols.length === 0) {
    const rows = await db.select<Goal[]>(`SELECT * FROM goals WHERE id=?`, [id]);
    return rows[0];
  }
  vals.push(id);
  await db.execute(`UPDATE goals SET ${cols.join(', ')} WHERE id=?`, vals);
  const rows = await db.select<Goal[]>(`SELECT * FROM goals WHERE id=?`, [id]);
  return rows[0];
}

export async function getLinkedTasks(goalId: number): Promise<Task[]> {
  const db = await getDb();
  return db.select<Task[]>(`SELECT * FROM tasks WHERE goal_id=? ORDER BY id`, [goalId]);
}

export async function linkTask(goalId: number, taskId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE tasks SET goal_id=?, updated_at=? WHERE id=?`,
    [goalId, new Date().toISOString(), taskId]
  );
}

export async function unlinkTask(taskId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE tasks SET goal_id=NULL, updated_at=? WHERE id=?`,
    [new Date().toISOString(), taskId]
  );
}

export async function getGoalLogs(goalId: number): Promise<GoalLog[]> {
  const db = await getDb();
  return db.select<GoalLog[]>(
    `SELECT * FROM goal_logs WHERE goal_id=? ORDER BY log_date, id`, [goalId]);
}

export async function addGoalLog(goalId: number, input: NewGoalLogInput): Promise<GoalLog> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO goal_logs (goal_id, log_date, increment, note, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      goalId, input.log_date, input.increment ?? 1,
      input.note ?? null, new Date().toISOString(),
    ]
  );
  const rows = await db.select<GoalLog[]>(
    `SELECT * FROM goal_logs WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function deleteGoalLog(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM goal_logs WHERE id=?`, [id]);
}