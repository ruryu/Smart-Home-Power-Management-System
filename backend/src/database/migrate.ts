import type { Db } from './database.module.js';

// schema.sql 只會建立還不存在的表；已經存在的舊資料庫，在這裡補上新欄位
export function migrate(db: Db) {
    const columns = db.prepare('PRAGMA table_info(appliances)').all() as { name: string }[];
    if (!columns.some((column) => column.name === 'state_reason')) {
        db.exec('ALTER TABLE appliances ADD COLUMN state_reason TEXT');
    }
}
