import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import type { Adjustment, Appliance, ApplianceState } from './appliances.js';

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
    };
}

@Injectable()
export class AppliancesRepository {
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    findAll(): Appliance[] {
        const rows = this.db
          .prepare(
            `SELECT id, room_id, name, rated_power, reduced_power, adjustment,
                    adjustment_order, requested_on, state, priority_order
             FROM appliances ORDER BY id`,
          )
          .all() as ApplianceRow[];
        return rows.map(toAppliance);
    }
}