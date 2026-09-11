import { describe, it, expect, beforeEach } from 'vitest';
import { useTmpDb } from './testDb';
import * as goals from '../goalRepository';
import * as tasks from '../taskRepository';

describe('goalRepository', () => {
  beforeEach(() => { useTmpDb(); });

  it('createGoal(binary) + getGoals', async () => {
    const g = await goals.createGoal({ title: 'Устроиться на работу', progress_type: 'binary' });
    expect(g.progress_type).toBe('binary');
    expect(g.status).toBe('active');
    expect(await goals.getGoals('active')).toHaveLength(1);
  });

  it('createGoal(counter) requires target_count by convention', async () => {
    const g = await goals.createGoal({
      title: '100 отжиманий', progress_type: 'counter', target_count: 100, unit_label: 'повторений',
    });
    expect(g.target_count).toBe(100);
    expect(g.unit_label).toBe('повторений');
  });

  it('updateGoal applies partial patch', async () => {
    const g = await goals.createGoal({ title: 'X' });
    const u = await goals.updateGoal(g.id, { title: 'Y', status: 'done' });
    expect(u.title).toBe('Y');
    expect(u.status).toBe('done');
  });

  it('linkTask/unlinkTask/getLinkedTasks', async () => {
    const g = await goals.createGoal({ title: 'G' });
    const t = await tasks.createTask({ title: 'T', scope: 'daily', due_date: '2026-09-04' });
    await goals.linkTask(g.id, t.id);
    const linked = await goals.getLinkedTasks(g.id);
    expect(linked).toHaveLength(1);
    await goals.unlinkTask(t.id);
    expect(await goals.getLinkedTasks(g.id)).toHaveLength(0);
  });

  it('addGoalLog / getGoalLogs / deleteGoalLog', async () => {
    const g = await goals.createGoal({
      title: '100 отжиманий', progress_type: 'counter', target_count: 100,
    });
    await goals.addGoalLog(g.id, { log_date: '2026-09-04', increment: 10 });
    await goals.addGoalLog(g.id, { log_date: '2026-09-04', increment: 15, note: 'вечер' });
    const logs = await goals.getGoalLogs(g.id);
    expect(logs).toHaveLength(2);
    await goals.deleteGoalLog(logs[0].id);
    expect(await goals.getGoalLogs(g.id)).toHaveLength(1);
  });

  it('ON DELETE CASCADE: deleting goal removes logs', async () => {
    const g = await goals.createGoal({ title: 'G' });
    await goals.addGoalLog(g.id, { log_date: '2026-09-04' });
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(`DELETE FROM goals WHERE id=?`, [g.id]);
    expect(await goals.getGoalLogs(g.id)).toHaveLength(0);
  });
});