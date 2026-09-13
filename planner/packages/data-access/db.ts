import Database from '@tauri-apps/plugin-sql';

let _db: Database | null = null;
export async function getDb(): Promise<Database> {
  if (_db) return _db;
  const Database = (await import('@tauri-apps/plugin-sql')).default;
  _db = await Database.load('sqlite:planner.db');
  return _db;
}
// для тестов
export function __setDbForTests(db: Database | null) { _db = db; }