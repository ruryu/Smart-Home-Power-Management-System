import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js';
import { resetDatabase } from '../database/seed.js';
import { HomeRepository } from '../home/home.repository.js';
import { PowerManagementService } from '../power-management/power-management.service.js';

// 測試介面：改變外在條件，讓助教可以重現每條規則
@Injectable()
export class SimulationService {
    constructor(
        @Inject(DATABASE) private readonly db: Db,
        private readonly home: HomeRepository,
        private readonly power: PowerManagementService,
    ) {}

    reset(): void {
        resetDatabase(this.db);
    }

    // 室溫、用電上限改變時，可能需要撤銷優先
    setIndoorTemperature(temperature: number): void {
        this.db.transaction(() => {
            this.home.setIndoorTemperature(temperature);
            this.power.reevaluate(true);
        })();
    }

    setPowerLimit(powerLimit: number): void {
        this.db.transaction(() => {
            this.home.setPowerLimit(powerLimit);
            this.power.reevaluate(true);
        })();
    }
}
