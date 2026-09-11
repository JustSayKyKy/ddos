export type TaskStatus = 'open' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskScope = 'daily' | 'weekly';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  goal_id: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  scope: TaskScope;
  due_date: string | null;
  week_start_date: string | null;
  is_recurring: number;
  recurrence_rule: string | null;
  parent_task_id: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewTaskInput {
  title: string;
  description?: string | null;
  category_id?: number | null;
  goal_id?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  scope: TaskScope;
  due_date?: string | null;
  week_start_date?: string | null;
  recurrence_rule?: string | null;
}

export interface DayFocus {
  day_date: string;
  focus_task_id: number | null;
  notes: string | null;
}

export type HabitTargetType = 'daily' | 'weekly_count' | 'monthly_count';
export type HabitPeriod = 'day' | 'week' | 'month' | 'year';

export interface Habit {
  id: number; name: string; icon: string | null; color: string;
  target_type: HabitTargetType; target_value: number;
  is_archived: number; sort_order: number; created_at: string;
}
export interface NewHabitInput {
  name: string; icon?: string | null; color?: string;
  target_type: HabitTargetType; target_value: number;
  sort_order?: number;
}
export interface HabitLog { habit_id: number; log_date: string; completed: number; }
export interface HabitFillGoal {
  id: number; habit_id: number | null; period: HabitPeriod;
  year: number; goal_target: number;
}
export interface HabitFillGoalInput {
  habit_id?: number | null; period: HabitPeriod; year: number; goal_target?: number;
}

export type FinanceCategoryType = 'income' | 'payment' | 'expense' | 'debt' | 'saving';
export interface FinanceCategory {
  id: number; name: string; type: FinanceCategoryType; color: string; sort_order: number;
}
export interface NewFinanceCategoryInput {
  name: string; type: FinanceCategoryType; color?: string; sort_order?: number;
}
export interface FinancePlanRow { category_id: number; year: number; month: number; amount: number; }
export interface Currency { code: string; symbol: string; name: string; }
export interface ExchangeRate {
  base_currency: string; quote_currency: string;
  rate_date: string; rate: number; source: 'online' | 'manual';
}
export interface FinanceAccount {
  id: number; name: string; currency_code: string;
  storage_type: 'cash' | 'cashless';
  is_debt: number; debt_direction: 'i_owe' | 'owed_to_me' | null;
  counterparty: string | null; opening_balance: number;
  is_archived: number; sort_order: number; created_at: string;
}
export interface NewFinanceAccountInput {
  name: string; currency_code: string;
  storage_type: 'cash' | 'cashless';
  is_debt?: number; debt_direction?: 'i_owe' | 'owed_to_me' | null;
  counterparty?: string | null; opening_balance?: number; sort_order?: number;
}
export interface FinanceTransaction {
  id: number; account_id: number; category_id: number | null;
  amount: number; tx_date: string; note: string | null; created_at: string;
}
export interface NewTransactionInput {
  account_id: number; category_id?: number | null;
  amount: number; tx_date: string; note?: string | null;
}
export interface FinanceMonthSnapshot {
  year: number; month: number; safety_cushion: number; crypto_amount: number;
}

export type GoalStatus = 'active' | 'done' | 'archived';
export type GoalProgressType = 'binary' | 'counter' | 'linked_tasks';
export interface Goal {
  id: number; title: string; description: string | null; target_date: string | null;
  progress_type: GoalProgressType; target_count: number | null;
  unit_label: string | null; quick_add_tag: string | null;
  status: GoalStatus; created_at: string;
}
export interface NewGoalInput {
  title: string; description?: string | null; target_date?: string | null;
  progress_type?: GoalProgressType; target_count?: number | null;
  unit_label?: string | null; quick_add_tag?: string | null;
}
export interface GoalLog {
  id: number; goal_id: number; log_date: string;
  increment: number; note: string | null; created_at: string;
}
export interface NewGoalLogInput {
  log_date: string; increment?: number; note?: string | null;
}