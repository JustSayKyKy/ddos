-- 0001_init.sql
-- Реализация DATABASE.md §1–§5 без отступлений от контракта.
-- Обновлено 2026-09-04: recurring tasks, day_focus.focus_task_id,
-- habit_fill_goals, мультивалютность (currencies/exchange_rates/finance_accounts),
-- goals с progress_type и goal_logs.

PRAGMA foreign_keys = ON;

-- ============ 1. Categories & Settings ============

CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE task_categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#94a3b8'
);

CREATE TABLE finance_categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  type  TEXT NOT NULL CHECK (type IN ('income','payment','expense','debt','saving')),
  color TEXT NOT NULL DEFAULT '#94a3b8',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(name, type)
);

-- ============ 2. Tasks / Weekly Planner ============
-- ВАЖНО: tasks.goal_id ссылается на goals(id), но goals создаётся в §5 ниже.
-- SQLite не поддерживает forward-ссылки через отдельный ALTER для FK,
-- поэтому goals определяется ДО tasks. Это отличается от порядка в DATABASE.md,
-- но не от его содержания. См. [ЭСКАЛАЦИЯ #1].
-- Дополнительно: для self-FK parent_task_id нумерация столбцов сохранена.

CREATE TABLE goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT,
  target_date   TEXT,
  progress_type TEXT NOT NULL DEFAULT 'linked_tasks'
                  CHECK (progress_type IN ('binary','counter','linked_tasks')),
  target_count  INTEGER,
  unit_label    TEXT,
  quick_add_tag TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','done','archived')),
  created_at    TEXT NOT NULL
);

CREATE TABLE tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  description  TEXT,
  category_id  INTEGER REFERENCES task_categories(id) ON DELETE SET NULL,
  goal_id      INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  priority     TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  scope        TEXT NOT NULL CHECK (scope IN ('daily','weekly')),
  due_date     TEXT,
  week_start_date TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT,
  parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_week_start ON tasks(week_start_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

CREATE TABLE day_focus (
  day_date       TEXT PRIMARY KEY,
  focus_task_id  INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  notes          TEXT
);

-- ============ 3. Habits ============

CREATE TABLE habits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  icon         TEXT,
  color        TEXT NOT NULL DEFAULT '#94a3b8',
  target_type  TEXT NOT NULL CHECK (target_type IN ('daily','weekly_count','monthly_count')),
  target_value INTEGER NOT NULL,
  is_archived  INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE habit_logs (
  habit_id  INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date  TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (habit_id, log_date)
);
CREATE INDEX idx_habit_logs_date ON habit_logs(log_date);

CREATE TABLE habit_fill_goals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id    INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  period      TEXT NOT NULL CHECK (period IN ('day','week','month','year')),
  year        INTEGER NOT NULL,
  goal_target REAL NOT NULL DEFAULT 100
);

-- ============ 4. Finance ============

CREATE TABLE currencies (
  code   TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name   TEXT NOT NULL
);

CREATE TABLE exchange_rates (
  base_currency  TEXT NOT NULL REFERENCES currencies(code),
  quote_currency TEXT NOT NULL REFERENCES currencies(code),
  rate_date      TEXT NOT NULL,
  rate           REAL NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('online','manual')),
  PRIMARY KEY (base_currency, quote_currency, rate_date)
);
CREATE INDEX idx_exchange_rates_date ON exchange_rates(rate_date);

CREATE TABLE finance_accounts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  currency_code  TEXT NOT NULL REFERENCES currencies(code),
  storage_type   TEXT NOT NULL CHECK (storage_type IN ('cash','cashless')),
  is_debt        INTEGER NOT NULL DEFAULT 0,
  debt_direction TEXT CHECK (debt_direction IN ('i_owe','owed_to_me')),
  counterparty   TEXT,
  opening_balance REAL NOT NULL DEFAULT 0,
  is_archived    INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE finance_plan (
  category_id INTEGER NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, year, month)
);

CREATE TABLE finance_transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id   INTEGER NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  category_id  INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
  amount       REAL NOT NULL,
  tx_date      TEXT NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_finance_tx_date ON finance_transactions(tx_date);
CREATE INDEX idx_finance_tx_account ON finance_transactions(account_id);
CREATE INDEX idx_finance_tx_category ON finance_transactions(category_id);

CREATE TABLE finance_month_snapshot (
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  safety_cushion REAL NOT NULL DEFAULT 0,
  crypto_amount  REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month)
);

-- ============ 5. Goals logs ============

CREATE TABLE goal_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id    INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  log_date   TEXT NOT NULL,
  increment  REAL NOT NULL DEFAULT 1,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_goal_logs_goal ON goal_logs(goal_id);

-- ============ Seed: валюты по умолчанию ============
-- Не «новая таблица», а данные, необходимые для работы FK на currencies.
-- См. [ЭСКАЛАЦИЯ #2].
INSERT INTO currencies (code, symbol, name) VALUES
  ('TRY', '₺', 'Турецкая лира'),
  ('EUR', '€', 'Евро'),
  ('USD', '$', 'Доллар США'),
  ('RUB', '₽', 'Российский рубль');