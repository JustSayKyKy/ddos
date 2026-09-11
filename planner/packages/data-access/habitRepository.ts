import { getDb } from './db';
import type {
  Habit, NewHabitInput, HabitLog, HabitFillGoal, HabitFillGoalInput, HabitPeriod,
} from '@shared/types';

export async function getHabits(includeArchived = false): Promise<Habit[]> {
  const db = await getDb();
  const sql = includeArchived
    ? `SELECT * FROM habits ORDER BY sort_order, id`
    : `SELECT * FROM habits WHERE is_archived=0 ORDER BY sort_order, id`;
  return db.select<Habit[]>(sql);
}

export async function createHabit(input: NewHabitInput): Promise<Habit> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO habits
      (name, icon, color, target_type, target_value, is_archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      input.name, input.icon ?? null, input.color ?? '#94a3b8',
      input.target_type, input.target_value, input.sort_order ?? 0,
      new Date().toISOString(),
    ]
  );
  const rows = await db.select<Habit[]>(`SELECT * FROM habits WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function archiveHabit(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE habits SET is_archived=1 WHERE id=?`, [id]);
}

export async function getLogs(
  rangeStart: string, rangeEnd: string, habitIds?: number[]
): Promise<HabitLog[]> {
  const db = await getDb();
  if (habitIds && habitIds.length > 0) {
    const placeholders = habitIds.map(() => '?').join(',');
    return db.select<HabitLog[]>(
      `SELECT * FROM habit_logs
        WHERE log_date BETWEEN ? AND ? AND habit_id IN (${placeholders})
        ORDER BY log_date`,
      [rangeStart, rangeEnd, ...habitIds]
    );
  }
  return db.select<HabitLog[]>(
    `SELECT * FROM habit_logs WHERE log_date BETWEEN ? AND ? ORDER BY log_date`,
    [rangeStart, rangeEnd]
  );
}

export async function toggleLog(habitId: number, date: string): Promise<HabitLog> {
  const db = await getDb();
  const existing = await db.select<HabitLog[]>(
    `SELECT * FROM habit_logs WHERE habit_id=? AND log_date=?`, [habitId, date]
  );
  if (existing.length > 0) {
    await db.execute(`DELETE FROM habit_logs WHERE habit_id=? AND log_date=?`, [habitId, date]);
    return { habit_id: habitId, log_date: date, completed: 0 };
  }
  await db.execute(
    `INSERT INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1)`,
    [habitId, date]
  );
  return { habit_id: habitId, log_date: date, completed: 1 };
}

export async function getFillGoal(
  period: HabitPeriod, year: number, habitId?: number
): Promise<HabitFillGoal | null> {
  const db = await getDb();
  const rows = habitId == null
    ? await db.select<HabitFillGoal[]>(
        `SELECT * FROM habit_fill_goals
          WHERE period=? AND year=? AND habit_id IS NULL`, [period, year])
    : await db.select<HabitFillGoal[]>(
        `SELECT * FROM habit_fill_goals
          WHERE period=? AND year=? AND habit_id=?`, [period, year, habitId]);
  return rows[0] ?? null;
}

export async function upsertFillGoal(input: HabitFillGoalInput): Promise<HabitFillGoal> {
  const db = await getDb();
  const existing = await getFillGoal(input.period, input.year, input.habit_id ?? undefined);
  if (existing) {
    await db.execute(
      `UPDATE habit_fill_goals SET goal_target=? WHERE id=?`,
      [input.goal_target ?? 100, existing.id]
    );
    const rows = await db.select<HabitFillGoal[]>(
      `SELECT * FROM habit_fill_goals WHERE id=?`, [existing.id]);
    return rows[0];
  }
  const res = await db.execute(
    `INSERT INTO habit_fill_goals (habit_id, period, year, goal_target)
     VALUES (?, ?, ?, ?)`,
    [input.habit_id ?? null, input.period, input.year, input.goal_target ?? 100]
  );
  const rows = await db.select<HabitFillGoal[]>(
    `SELECT * FROM habit_fill_goals WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}