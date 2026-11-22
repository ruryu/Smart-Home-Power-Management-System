import { Module } from '@nestjs/common';
import { HomeModule } from '../home/home.module.js';
import { PowerManagementModule } from '../power-management/power-management.module.js';
import { StatusModule } from '../status/status.module.js';
import { SimulationController } from './simulation.controller.js';
import { SimulationService } from './simulation.service.js';

@Module({
    imports: [HomeModule, PowerManagementModule, StatusModule],
    controllers: [SimulationController],
    providers: [SimulationService],
})
export class SimulationModule {}
