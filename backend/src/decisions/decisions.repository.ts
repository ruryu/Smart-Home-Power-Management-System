import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import type { Decision } from '../power-management/rules/evaluate.js';

@Injectable()
export class DecisionsRepository {
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    record(decision: Decision): void {
        this.db
          .prepare(
            `INSERT INTO decisions (created_at, rule, appliance_id, action, reason)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(new Date().toISOString(), decision.rule, decision.applianceId, decision.action, decision.reason);
    }

    recordAll(decisions: Decision[]): void {
        decisions.forEach((decision) => this.record(decision));
    }
}
