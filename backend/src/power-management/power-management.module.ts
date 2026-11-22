import { Module } from '@nestjs/common';
import { AppliancesModule } from '../appliances/appliances.module.js';
import { DecisionsModule } from '../decisions/decisions.module.js';
import { HomeModule } from '../home/home.module.js';
import { StatusModule } from '../status/status.module.js';
import { PowerManagementController } from './power-management.controller.js';
import { PowerManagementService } from './power-management.service.js';

@Module({
    imports: [AppliancesModule, HomeModule, DecisionsModule, StatusModule],
    controllers: [PowerManagementController],
    providers: [PowerManagementService],
    exports: [PowerManagementService],
})
export class PowerManagementModule {}
