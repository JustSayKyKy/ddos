import { getDb } from './db';
import type {
  FinanceCategory, NewFinanceCategoryInput, FinanceCategoryType,
  FinancePlanRow, Currency, ExchangeRate, FinanceAccount,
  NewFinanceAccountInput, FinanceTransaction, NewTransactionInput,
  FinanceMonthSnapshot,
} from '@shared/types';

// ---- Бюджетный слой ----

export async function getCategories(type?: FinanceCategoryType): Promise<FinanceCategory[]> {
  const db = await getDb();
  if (type) {
    return db.select<FinanceCategory[]>(
      `SELECT * FROM finance_categories WHERE type=? ORDER BY sort_order, id`, [type]);
  }
  return db.select<FinanceCategory[]>(
    `SELECT * FROM finance_categories ORDER BY type, sort_order, id`);
}

export async function createCategory(input: NewFinanceCategoryInput): Promise<FinanceCategory> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO finance_categories (name, type, color, sort_order)
     VALUES (?, ?, ?, ?)`,
    [input.name, input.type, input.color ?? '#94a3b8', input.sort_order ?? 0]
  );
  const rows = await db.select<FinanceCategory[]>(
    `SELECT * FROM finance_categories WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function getPlan(year: number, month: number): Promise<FinancePlanRow[]> {
  const db = await getDb();
  return db.select<FinancePlanRow[]>(
    `SELECT * FROM finance_plan WHERE year=? AND month=?`, [year, month]);
}

export async function upsertPlan(
  categoryId: number, year: number, month: number, amount: number
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO finance_plan (category_id, year, month, amount) VALUES (?, ?, ?, ?)
     ON CONFLICT(category_id, year, month) DO UPDATE SET amount=excluded.amount`,
    [categoryId, year, month, amount]
  );
}

export async function getTransactions(
  year: number, month: number, accountId?: number, categoryId?: number
): Promise<FinanceTransaction[]> {
  const db = await getDb();
  const mm = String(month).padStart(2, '0');
  const prefix = `${year}-${mm}-%`;
  const conds = [`tx_date LIKE ?`]; const vals: unknown[] = [prefix];
  if (accountId != null) { conds.push('account_id=?'); vals.push(accountId); }
  if (categoryId != null) { conds.push('category_id=?'); vals.push(categoryId); }
  return db.select<FinanceTransaction[]>(
    `SELECT * FROM finance_transactions WHERE ${conds.join(' AND ')} ORDER BY tx_date, id`,
    vals
  );
}

export async function addTransaction(input: NewTransactionInput): Promise<FinanceTransaction> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO finance_transactions
      (account_id, category_id, amount, tx_date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.account_id, input.category_id ?? null, input.amount,
      input.tx_date, input.note ?? null, new Date().toISOString(),
    ]
  );
  const rows = await db.select<FinanceTransaction[]>(
    `SELECT * FROM finance_transactions WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM finance_transactions WHERE id=?`, [id]);
}

export async function getMonthSnapshot(
  year: number, month: number
): Promise<FinanceMonthSnapshot> {
  const db = await getDb();
  const rows = await db.select<FinanceMonthSnapshot[]>(
    `SELECT * FROM finance_month_snapshot WHERE year=? AND month=?`, [year, month]);
  return rows[0] ?? { year, month, safety_cushion: 0, crypto_amount: 0 };
}

export async function upsertMonthSnapshot(
  year: number, month: number, patch: Partial<FinanceMonthSnapshot>
): Promise<void> {
  const db = await getDb();
  const current = await getMonthSnapshot(year, month);
  const next = { ...current, ...patch, year, month };
  await db.execute(
    `INSERT INTO finance_month_snapshot (year, month, safety_cushion, crypto_amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET
       safety_cushion=excluded.safety_cushion,
       crypto_amount=excluded.crypto_amount`,
    [next.year, next.month, next.safety_cushion, next.crypto_amount]
  );
}

// ---- Счета/валюты/курсы ----

export async function getCurrencies(): Promise<Currency[]> {
  const db = await getDb();
  return db.select<Currency[]>(`SELECT * FROM currencies ORDER BY code`);
}

export async function getAccounts(includeArchived = false): Promise<FinanceAccount[]> {
  const db = await getDb();
  const sql = includeArchived
    ? `SELECT * FROM finance_accounts ORDER BY sort_order, id`
    : `SELECT * FROM finance_accounts WHERE is_archived=0 ORDER BY sort_order, id`;
  return db.select<FinanceAccount[]>(sql);
}

export async function createAccount(input: NewFinanceAccountInput): Promise<FinanceAccount> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO finance_accounts
      (name, currency_code, storage_type, is_debt, debt_direction, counterparty,
       opening_balance, is_archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      input.name, input.currency_code, input.storage_type,
      input.is_debt ?? 0, input.debt_direction ?? null, input.counterparty ?? null,
      input.opening_balance ?? 0, input.sort_order ?? 0, new Date().toISOString(),
    ]
  );
  const rows = await db.select<FinanceAccount[]>(
    `SELECT * FROM finance_accounts WHERE id=?`, [res.lastInsertId]);
  return rows[0];
}

export async function archiveAccount(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE finance_accounts SET is_archived=1 WHERE id=?`, [id]);
}

export async function getRate(
  base: string, quote: string, date: string
): Promise<ExchangeRate | null> {
  const db = await getDb();
  const rows = await db.select<ExchangeRate[]>(
    `SELECT * FROM exchange_rates
      WHERE base_currency=? AND quote_currency=? AND rate_date <= ?
      ORDER BY rate_date DESC, (source='manual') DESC
      LIMIT 1`,
    [base, quote, date]
  );
  return rows[0] ?? null;
}

export async function setManualRate(
  base: string, quote: string, date: string, rate: number
): Promise<ExchangeRate> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO exchange_rates (base_currency, quote_currency, rate_date, rate, source)
     VALUES (?, ?, ?, ?, 'manual')
     ON CONFLICT(base_currency, quote_currency, rate_date)
     DO UPDATE SET rate=excluded.rate, source='manual'`,
    [base, quote, date, rate]
  );
  const rows = await db.select<ExchangeRate[]>(
    `SELECT * FROM exchange_rates
      WHERE base_currency=? AND quote_currency=? AND rate_date=?`,
    [base, quote, date]
  );
  return rows[0];
}

/**
 * Сетевой запрос — единственная функция DAL с выходом в интернет (ARCHITECTURE.md).
 * Здесь оставлен каркас: реальный провайдер конфигурируется через app_settings.
 * См. [ЭСКАЛАЦИЯ #5].
 */
export async function refreshOnlineRates(
  date: string, currencyCodes: string[]
): Promise<ExchangeRate[]> {
  void date; void currencyCodes;
  throw new Error('refreshOnlineRates: not implemented in Phase 1 (requires provider config)');
}

export async function getPrimaryCurrency(): Promise<string> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM app_settings WHERE key='primary_currency'`);
  return rows[0]?.value ?? 'TRY';
}

export async function setPrimaryCurrency(code: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO app_settings (key, value) VALUES ('primary_currency', ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [code]
  );
}