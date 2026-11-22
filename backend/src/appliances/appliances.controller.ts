import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { notFound } from '../common/api-error.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';
import { AppliancesRepository } from './appliances.repository.js';
import { parseCreateAppliance } from './create-appliance.js';
import { parseUpdateAppliance } from './update-appliance.js';

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

    @Patch(':id')
    update(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        this.ensureApplianceExists(id);
        const input = parseUpdateAppliance(body);
        if (input.roomId !== undefined) this.ensureRoomExists(input.roomId);
        return this.appliances.update(id, input);
    }

    private ensureApplianceExists(id: number) {
        if (!this.appliances.findById(id)) {
            throw notFound('APPLIANCE_NOT_FOUND', '找不到這個裝置', { applianceId: id });
        }
    }

    private ensureRoomExists(roomId: number) {
        if (!this.rooms.findById(roomId)) {
            throw notFound('ROOM_NOT_FOUND', '找不到這個房間', { roomId });
        }
    }
}
