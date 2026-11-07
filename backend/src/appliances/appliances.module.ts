import { Module } from '@nestjs/common';
import { AppliancesRepository } from './appliances.repository.js';
import { AppliancesController } from './appliances.controller.js';

@Module({
    controllers: [AppliancesController],
    providers: [AppliancesRepository],
    exports: [AppliancesRepository],
})
export class AppliancesModule {}