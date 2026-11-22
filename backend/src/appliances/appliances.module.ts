import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module.js';
import { AppliancesRepository } from './appliances.repository.js';
import { AppliancesController } from './appliances.controller.js';

@Module({
    imports: [RoomsModule],
    controllers: [AppliancesController],
    providers: [AppliancesRepository],
    exports: [AppliancesRepository],
})
export class AppliancesModule {}
