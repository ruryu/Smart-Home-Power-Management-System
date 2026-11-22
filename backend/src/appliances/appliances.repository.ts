import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import type { Adjustment, Appliance, ApplianceState } from './appliances.js';
import type { CreateApplianceInput } from './create-appliance.js';
import type { UpdateApplianceInput } from './update-appliance.js';

const COLUMNS = `id, room_id, name, rated_power, reduced_power, adjustment,
                 adjustment_order, requested_on, state, priority_order, state_reason`;

type ApplianceRow = {
    id: number;
    room_id: number;
    name: string;
    rated_power: number;
    reduced_power: number | null;
    adjustment: Adjustment;
    adjustment_order: number | null;
    requested_on: number;
    state: ApplianceState;
    priority_order: number | null;
    state_reason: string | null;
};

function toAppliance(row: ApplianceRow): Appliance {
    return {
        id: row.id,
        roomId: row.room_id,
        name: row.name,
        ratedPower: row.rated_power,
        reducedPower: row.reduced_power,
        adjustment: row.adjustment,
        adjustmentOrder: row.adjustment_order,
        requestedOn: row.requested_on === 1,
        state: row.state,
        priorityOrder: row.priority_order,
        reason: row.state_reason,
    };
}

@Injectable()
export class AppliancesRepository {
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    findAll(): Appliance[] {
        const rows = this.db
          .prepare(`SELECT ${COLUMNS} FROM appliances ORDER BY id`)
          .all() as ApplianceRow[];
        return rows.map(toAppliance);
    }

    findById(id: number): Appliance | undefined {
        const row = this.db
          .prepare(`SELECT ${COLUMNS} FROM appliances WHERE id = ?`)
          .get(id) as ApplianceRow | undefined;
        return row ? toAppliance(row) : undefined;
    }

    create(input: CreateApplianceInput): Appliance {
        const adjustmentOrder = input.adjustment === 'none' ? null : this.nextAdjustmentOrder();
        const result = this.db
          .prepare(
            `INSERT INTO appliances (room_id, name, rated_power, reduced_power, adjustment, adjustment_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(input.roomId, input.name, input.ratedPower, input.reducedPower, input.adjustment, adjustmentOrder);
        return this.findById(Number(result.lastInsertRowid))!;
    }

    update(id: number, input: UpdateApplianceInput): Appliance {
        const current = this.findById(id)!;
        this.db
          .prepare('UPDATE appliances SET name = ?, room_id = ? WHERE id = ?')
          .run(input.name ?? current.name, input.roomId ?? current.roomId, id);
        return this.findById(id)!;
    }

    setRequestedOn(id: number, requestedOn: boolean): void {
        this.db.prepare('UPDATE appliances SET requested_on = ? WHERE id = ?').run(requestedOn ? 1 : 0, id);
    }

    setPriorityOrder(id: number, priorityOrder: number | null): void {
        this.db.prepare('UPDATE appliances SET priority_order = ? WHERE id = ?').run(priorityOrder, id);
    }

    // 新指定的優先排在最後，數字越大代表越晚指定
    nextPriorityOrder(): number {
        const row = this.db
          .prepare('SELECT COALESCE(MAX(priority_order), 0) + 1 AS next FROM appliances')
          .get() as { next: number };
        return row.next;
    }

    // 故障時停止運作，並取消使用者的開啟要求，修復後要由使用者重新開啟
    markFaulted(id: number, reason: string): void {
        this.db
          .prepare("UPDATE appliances SET state = 'faulted', requested_on = 0, state_reason = ? WHERE id = ?")
          .run(reason, id);
    }

    markRepaired(id: number): void {
        this.db.prepare("UPDATE appliances SET state = 'off', state_reason = NULL WHERE id = ?").run(id);
    }

    // 寫回系統計算後的狀態
    saveStates(appliances: Appliance[]): void {
        const update = this.db.prepare(
            'UPDATE appliances SET state = ?, state_reason = ?, priority_order = ? WHERE id = ?',
        );
        appliances.forEach((appliance) =>
            update.run(appliance.state, appliance.reason, appliance.priorityOrder, appliance.id),
        );
    }

    delete(id: number): void {
        this.db.prepare('DELETE FROM appliances WHERE id = ?').run(id);
    }

    // 新裝置排在調整順序的最後
    private nextAdjustmentOrder(): number {
        const row = this.db
          .prepare('SELECT COALESCE(MAX(adjustment_order), 0) + 1 AS next FROM appliances')
          .get() as { next: number };
        return row.next;
    }
}
