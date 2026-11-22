import { Injectable } from '@nestjs/common';
import { AppliancesRepository } from '../appliances/appliances.repository.js';
import type { Appliance } from '../appliances/appliances.js';
import { HomeRepository } from '../home/home.repository.js';
import type { HomeState } from '../home/home-state.js';
import { currentPower, RESTORE_MARGIN, totalPower } from '../power-management/rules/power.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';

const ADJUSTED_LABELS: Partial<Record<Appliance['state'], string>> = {
    delayed: '延後',
    reduced: '降載',
};

@Injectable()
export class StatusService {
    constructor(
        private readonly home: HomeRepository,
        private readonly rooms: RoomsRepository,
        private readonly appliances: AppliancesRepository,
    ) {}

    getStatus() {
        const home = this.home.get();
        const appliances = this.appliances.findAll();
        const total = totalPower(appliances);
        const unresolvedOverload = total > home.powerLimit ? total - home.powerLimit : null;

        return {
            totalPower: total,
            powerLimit: home.powerLimit,
            restoreThreshold: home.powerLimit - RESTORE_MARGIN,
            indoorTemperature: home.indoorTemperature,
            comfortThreshold: home.comfortThreshold,
            comfortActive: home.indoorTemperature > home.comfortThreshold,
            unresolvedOverload,
            rooms: this.rooms.findAll(),
            appliances: appliances.map((appliance) => ({
                ...appliance,
                currentPower: currentPower(appliance),
            })),
            warnings: this.warnings(home, appliances, unresolvedOverload),
        };
    }

    // 要顯示給使用者看的警告
    private warnings(home: HomeState, appliances: Appliance[], unresolvedOverload: number | null): string[] {
        const warnings: string[] = [];

        if (unresolvedOverload !== null) {
            warnings.push(
                `總用電超過上限 ${home.powerLimit}W 共 ${unresolvedOverload}W，已無法再調整，暫停接受增加用電的操作`,
            );
        }

        if (home.indoorTemperature > home.comfortThreshold) {
            warnings.push(`室溫 ${home.indoorTemperature}°C 超過舒適門檻 ${home.comfortThreshold}°C，冷氣不會被降載`);
        }

        const adjusted = appliances
            .filter((appliance) => ADJUSTED_LABELS[appliance.state])
            .map((appliance) => `${appliance.name}（${ADJUSTED_LABELS[appliance.state]}）`);
        if (adjusted.length > 0) {
            warnings.push(`為了不超過上限 ${home.powerLimit}W，系統已調整：${adjusted.join('、')}`);
        }

        return warnings;
    }
}
