import { Module } from '@nestjs/common';
import { AppliancesModule } from ',,/appliances/appliances.module.js';
import { HomeModule } from '../home/home.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { StatusController } from './status.controller.js';
import { StatusService } from './status.setvice.js';

@Module({
    imports: [HomeModule, RoomsModule, AppliancesModule],
    controllers: [StatusController],
    providers: [StatusService],
})
export class StatusModule {}