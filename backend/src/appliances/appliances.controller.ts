import { Body, Controller, Get, Post } from '@nestjs/common';
import { notFound } from '../common/api-error.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';
import { AppliancesRepository } from './appliances.repository.js';
import { parseCreateAppliance } from './create-appliance.js';

@Controller('appliances')
export class AppliancesController {
    constructor(
        private readonly appliances: AppliancesRepository,
        private readonly rooms: RoomsRepository,
    ) {}

    @Get()
    findAll() {
        return this.appliances.findAll();
    }

    @Post()
    create(@Body() body: unknown) {
        const input = parseCreateAppliance(body);
        this.ensureRoomExists(input.roomId);
        return this.appliances.create(input);
    }

    private ensureRoomExists(roomId: number) {
        if (!this.rooms.findById(roomId)) {
            throw notFound('ROOM_NOT_FOUND', '找不到這個房間', { roomId });
        }
    }
}
