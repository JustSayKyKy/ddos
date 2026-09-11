import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { __setDbForTests } from '../db';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TauriLikeDb {
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<{ lastInsertId: number; rowsAffected: number }>;
}

export function makeTmpDb(): TauriLikeDb {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const sqlPath = join(__dirname, '../../../src-tauri/migrations/0001_init.sql');
  db.exec(readFileSync(sqlPath, 'utf8'));
  const adapter: TauriLikeDb = {
    async select<T>(sql: string, params: unknown[] = []): Promise<T> {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T;
    },
    async execute(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return { lastInsertId: Number(info.lastInsertRowid), rowsAffected: info.changes };
    },
  };
  return adapter;
}

export function useTmpDb() {
  const db = makeTmpDb();
  __setDbForTests(db as never);
  return db;
}