import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import type { Room } from './room.js';

@Injectable()
export class RoomsRepository{
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    findAll(): Room[] {
        return this.db.prepare('SELECT id, name FROM rooms ORDER BY id').all() as Room[];
    }

    findById(id: number): Room | undefined {
        return this.db.prepare('SELECT id, name FROM rooms WHERE id = ?').get(id) as Room | undefined;
    }

    findByName(name: string): Room | undefined {
        return this.db.prepare('SELECT id, name FROM rooms WHERE name = ?').get(name) as Room | undefined;
    }

    create(name: string): Room {
        const result = this.db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name);
        return this.findById(Number(result.lastInsertRowid))!;
    }

    rename(id: number, name: string): Room {
        this.db.prepare('UPDATE rooms SET name = ? WHERE id = ?').run(name, id);
        return this.findById(id)!;
    }

    delete(id: number): void {
        this.db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    }

    countAppliances(id: number): number {
        const row = this.db
          .prepare('SELECT COUNT(*) AS count FROM appliances WHERE room_id = ?')
          .get(id) as { count: number };
        return row.count;
    }
}
