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

    // 新裝置排在調整順序的最後
    private nextAdjustmentOrder(): number {
        const row = this.db
          .prepare('SELECT COALESCE(MAX(adjustment_order), 0) + 1 AS next FROM appliances')
          .get() as { next: number };
        return row.next;
    }
}
