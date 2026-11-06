import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import type { Room } from './room.js';

@Injectable()
export class RoomsRepository{
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    findAll(): Room[] {
        return this.db.prepare('SELECT id, name FROM rooms ORDER BY id').all() as Room[];
    }
}