import { Injectable } from '@nestjs/common';
import { AppliancesRepository } from '../appliances/appliances.repository.js';
import { HomeRepository } from ',,/home/home.repository.js';
import { currentPower, RESTORE_MARGIN, totalPower } from '../power-management/rules/power.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';

@Injectable()
export class StatusService {
    constructor(
        private readonly home: HomeRepository,
        private readonly rooms: RoomsRepository,
        private readonly appliances: AppliancesRepository,
    ) {}

    getStatus() {
        const home = this.home.get();
        const appliances = this.appliances.findAll()

        return {
            totalPower: totalPower(appliances),
            powerLimit: home.powerLimit,
            restoreThreshold: home.powerLimit - RESTORE_MARGIN,
            indoorTemperature: home.indoorTemperature,
            comfortThreshold: home.comfortThreshold,
            comfortActive: home.indoorTemperature > home.comfortThreshold,
            unresolvedOverload: null,
            rooms: this.rooms.findAll(),
            appliances: appliances.map((appliance) => ({
                ...appliance,
                currentPower: currentPower(appliance),
            })),
            warnings: [],
        };
    }
}