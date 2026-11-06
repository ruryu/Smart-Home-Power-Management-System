import { Module } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository.js';

@Module({
    providers: [RoomsRepository],
    exports: [RoomsRepository],
})
export class RoomModule {}