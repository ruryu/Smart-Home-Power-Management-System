import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { seedIfEmpty } from './seed.js';

export const DATABASE = Symbol(`DATABASE`);
export type Db = Database.Database;

// 開啟資料庫，沒設定則路徑是data/shpms.db
function openDatabase(): Db {
    const path = process.env.DATABASE_PATH ?? 'data/shpms.db';
    if (path !== ':memory:') {
        mkdirSync(dirname(path), { recursive: true });
    }

    const db = new Database(path);
    db.pragma('foreign_keys = ON');
    db.exec(readFileSync(join(import.meta.dirname, 'schema.sql'), 'utf8')) // 建表
    seedIfEmpty(db);
    return db;
}

// 把資料庫提供給其他模組
@Global()
@Module({
    providers: [{ provide: DATABASE, useFactory: openDatabase}],
    exports: [DATABASE],
})

export class DatabaseModule implements OnApplicationShutdown {
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    // 關閉資料庫
    onApplicationShutdown() {
        this.db.close();
    }
}