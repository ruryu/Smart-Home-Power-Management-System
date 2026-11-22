import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import type { Decision, Rule } from '../power-management/rules/evaluate.js';
import { RULE_NAMES, type DecisionRecord } from './decision-record.js';

type DecisionRow = {
    id: number;
    created_at: string;
    rule: Rule;
    appliance_id: number | null;
    appliance_name: string | null;
    action: string;
    reason: string;
};

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

    // 最新的在前面；裝置被刪除後 applianceId 和 applianceName 會是 null
    findRecent(limit: number): DecisionRecord[] {
        const rows = this.db
          .prepare(
            `SELECT d.id, d.created_at, d.rule, d.appliance_id, a.name AS appliance_name, d.action, d.reason
             FROM decisions d LEFT JOIN appliances a ON a.id = d.appliance_id
             ORDER BY d.id DESC LIMIT ?`,
          )
          .all(limit) as DecisionRow[];
        return rows.map((row) => ({
            id: row.id,
            createdAt: row.created_at,
            rule: row.rule,
            ruleName: RULE_NAMES[row.rule],
            applianceId: row.appliance_id,
            applianceName: row.appliance_name,
            action: row.action,
            reason: row.reason,
        }));
    }
}
