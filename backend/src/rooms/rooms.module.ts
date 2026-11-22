import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller.js';
import { RoomsRepository } from './rooms.repository.js';

@Module({
    controllers: [RoomsController],
    providers: [RoomsRepository],
    exports: [RoomsRepository],
})
export class RoomsModule {}
