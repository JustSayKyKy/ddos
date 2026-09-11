import { describe, it, expect, beforeEach } from 'vitest';
import { useTmpDb } from './testDb';
import * as repo from '../habitRepository';

describe('habitRepository', () => {
  beforeEach(() => { useTmpDb(); });

  it('createHabit + getHabits', async () => {
    const h = await repo.createHabit({
      name: 'Тренировка', target_type: 'daily', target_value: 31,
    });
    expect(h.id).toBeGreaterThan(0);
    expect(h.is_archived).toBe(0);
    const list = await repo.getHabits();
    expect(list).toHaveLength(1);
  });

  it('archiveHabit hides from default list', async () => {
    const h = await repo.createHabit({ name: 'X', target_type: 'daily', target_value: 1 });
    await repo.archiveHabit(h.id);
    expect(await repo.getHabits()).toHaveLength(0);
    expect(await repo.getHabits(true)).toHaveLength(1);
  });

  it('toggleLog inserts then deletes', async () => {
    const h = await repo.createHabit({ name: 'X', target_type: 'daily', target_value: 1 });
    const l1 = await repo.toggleLog(h.id, '2026-09-04');
    expect(l1.completed).toBe(1);
    const l2 = await repo.toggleLog(h.id, '2026-09-04');
    expect(l2.completed).toBe(0);
    const logs = await repo.getLogs('2026-09-01', '2026-09-30');
    expect(logs).toHaveLength(0);
  });

  it('getLogs filters by habitIds', async () => {
    const a = await repo.createHabit({ name: 'A', target_type: 'daily', target_value: 1 });
    const b = await repo.createHabit({ name: 'B', target_type: 'daily', target_value: 1 });
    await repo.toggleLog(a.id, '2026-09-04');
    await repo.toggleLog(b.id, '2026-09-04');
    const onlyA = await repo.getLogs('2026-09-01', '2026-09-30', [a.id]);
    expect(onlyA).toHaveLength(1);
    expect(onlyA[0].habit_id).toBe(a.id);
  });

  it('upsertFillGoal creates then updates (no reward_text)', async () => {
    const h = await repo.createHabit({ name: 'X', target_type: 'daily', target_value: 1 });
    const g1 = await repo.upsertFillGoal({
      habit_id: h.id, period: 'month', year: 2026, goal_target: 80,
    });
    expect(g1.goal_target).toBe(80);
    const g2 = await repo.upsertFillGoal({
      habit_id: h.id, period: 'month', year: 2026, goal_target: 95,
    });
    expect(g2.id).toBe(g1.id);
    expect(g2.goal_target).toBe(95);
  });

  it('habit_id=NULL fill goal is a global one', async () => {
    const g = await repo.upsertFillGoal({ period: 'year', year: 2026 });
    expect(g.habit_id).toBeNull();
    expect(g.goal_target).toBe(100);
  });

  it('ON DELETE CASCADE: deleting habit removes logs', async () => {
    const h = await repo.createHabit({ name: 'X', target_type: 'daily', target_value: 1 });
    await repo.toggleLog(h.id, '2026-09-04');
    await repo.archiveHabit(h.id); // нет hard-delete в API, но FK всё равно должен сработать
    // hard delete делаем прямым SQL — тестируем только FK-инвариант
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(`DELETE FROM habits WHERE id=?`, [h.id]);
    const logs = await repo.getLogs('2026-09-01', '2026-09-30');
    expect(logs).toHaveLength(0);
  });
});