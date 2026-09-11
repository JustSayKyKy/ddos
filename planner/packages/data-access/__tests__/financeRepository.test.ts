import { describe, it, expect, beforeEach } from 'vitest';
import { useTmpDb } from './testDb';
import * as repo from '../financeRepository';

describe('financeRepository', () => {
  beforeEach(() => { useTmpDb(); });

  it('createCategory + getCategories(type)', async () => {
    await repo.createCategory({ name: 'Зарплата', type: 'income' });
    await repo.createCategory({ name: 'Продукты', type: 'expense' });
    const inc = await repo.getCategories('income');
    expect(inc).toHaveLength(1);
    expect(inc[0].name).toBe('Зарплата');
    const all = await repo.getCategories();
    expect(all).toHaveLength(2);
  });

  it('UNIQUE(name,type) enforced', async () => {
    await repo.createCategory({ name: 'X', type: 'expense' });
    await expect(repo.createCategory({ name: 'X', type: 'expense' })).rejects.toThrow();
    // та же name с другим type — можно
    await expect(repo.createCategory({ name: 'X', type: 'income' })).resolves.toBeTruthy();
  });

  it('upsertPlan creates then updates', async () => {
    const c = await repo.createCategory({ name: 'Продукты', type: 'expense' });
    await repo.upsertPlan(c.id, 2026, 1, 1000);
    await repo.upsertPlan(c.id, 2026, 1, 1500);
    const rows = await repo.getPlan(2026, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(1500);
  });

  it('createAccount + getAccounts + archiveAccount', async () => {
    const a = await repo.createAccount({
      name: 'Наличные EUR', currency_code: 'EUR', storage_type: 'cash',
    });
    expect(a.id).toBeGreaterThan(0);
    await repo.createAccount({
      name: 'Долг — Иван', currency_code: 'TRY', storage_type: 'cashless',
      is_debt: 1, debt_direction: 'i_owe', counterparty: 'Иван',
    });
    expect(await repo.getAccounts()).toHaveLength(2);
    await repo.archiveAccount(a.id);
    expect(await repo.getAccounts()).toHaveLength(1);
    expect(await repo.getAccounts(true)).toHaveLength(2);
  });

  it('addTransaction + getTransactions by month/account/category + deleteTransaction', async () => {
    const c = await repo.createCategory({ name: 'Продукты', type: 'expense' });
    const a = await repo.createAccount({
      name: 'Карта TRY', currency_code: 'TRY', storage_type: 'cashless',
    });
    const t1 = await repo.addTransaction({
      account_id: a.id, category_id: c.id, amount: -250, tx_date: '2026-01-15',
    });
    await repo.addTransaction({
      account_id: a.id, amount: 1000, tx_date: '2026-01-20',
    });
    await repo.addTransaction({
      account_id: a.id, amount: 9999, tx_date: '2026-02-01',
    });
    const jan = await repo.getTransactions(2026, 1);
    expect(jan).toHaveLength(2);
    const byCat = await repo.getTransactions(2026, 1, undefined, c.id);
    expect(byCat).toHaveLength(1);
    const byAcc = await repo.getTransactions(2026, 1, a.id);
    expect(byAcc).toHaveLength(2);
    await repo.deleteTransaction(t1.id);
    expect(await repo.getTransactions(2026, 1)).toHaveLength(1);
  });

  it('FK: transaction cannot reference missing account', async () => {
    await expect(repo.addTransaction({
      account_id: 999, amount: 1, tx_date: '2026-01-01',
    })).rejects.toThrow();
  });

  it('setManualRate + getRate (manual preferred on same date)', async () => {
    await repo.setManualRate('USD', 'TRY', '2026-09-04', 34.2);
    const r = await repo.getRate('USD', 'TRY', '2026-09-04');
    expect(r?.rate).toBe(34.2);
    expect(r?.source).toBe('manual');
  });

  it('getRate returns latest available <= date (fallback)', async () => {
    await repo.setManualRate('USD', 'TRY', '2026-09-01', 34.0);
    await repo.setManualRate('USD', 'TRY', '2026-09-03', 34.1);
    const r = await repo.getRate('USD', 'TRY', '2026-09-04');
    expect(r?.rate).toBe(34.1);
  });

  it('getPrimaryCurrency default + setPrimaryCurrency', async () => {
    expect(await repo.getPrimaryCurrency()).toBe('TRY');
    await repo.setPrimaryCurrency('EUR');
    expect(await repo.getPrimaryCurrency()).toBe('EUR');
  });

  it('upsertMonthSnapshot creates then patches', async () => {
    await repo.upsertMonthSnapshot(2026, 1, { safety_cushion: 1000 });
    let s = await repo.getMonthSnapshot(2026, 1);
    expect(s.safety_cushion).toBe(1000);
    await repo.upsertMonthSnapshot(2026, 1, { crypto_amount: 500 });
    s = await repo.getMonthSnapshot(2026, 1);
    expect(s.safety_cushion).toBe(1000);
    expect(s.crypto_amount).toBe(500);
  });

  it('refreshOnlineRates throws in Phase 1 (explicit)', async () => {
    await expect(repo.refreshOnlineRates('2026-09-04', ['USD'])).rejects.toThrow(/not implemented/);
  });
});