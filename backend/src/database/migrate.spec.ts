import Database from 'better-sqlite3';
import { migrate } from './migrate.js';

describe('migrate', () => {
  it('舊資料庫沒有 state_reason 時會補上', () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE appliances (id INTEGER PRIMARY KEY, name TEXT)');
    migrate(db);
    migrate(db); // 重複執行不會出錯
    const columns = db.prepare('PRAGMA table_info(appliances)').all() as { name: string }[];
    expect(columns.map((column) => column.name)).toContain('state_reason');
    db.close();
  });
});
