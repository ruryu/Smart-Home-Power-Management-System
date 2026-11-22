import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { conflict, notFound } from '../common/api-error.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { parseRoomName } from './room-input.js';
import { RoomsRepository } from './rooms.repository.js';

@Controller('rooms')
export class RoomsController {
    constructor(private readonly rooms: RoomsRepository) {}

    @Get()
    findAll() {
        return this.rooms.findAll();
    }

    @Post()
    create(@Body() body: unknown) {
        const name = parseRoomName(body);
        this.ensureNameAvailable(name);
        return this.rooms.create(name);
    }

    @Patch(':id')
    rename(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        this.ensureRoomExists(id);
        const name = parseRoomName(body);
        this.ensureNameAvailable(name, id);
        return this.rooms.rename(id, name);
    }

    @Delete(':id')
    @HttpCode(204)
    delete(@Param('id', ParseIdPipe) id: number) {
        this.ensureRoomExists(id);
        const applianceCount = this.rooms.countAppliances(id);
        if (applianceCount > 0) {
            throw conflict('ROOM_NOT_EMPTY', '房間裡還有裝置，要先移走或刪除裝置', { roomId: id, applianceCount });
        }
        this.rooms.delete(id);
    }

    private ensureRoomExists(id: number) {
        if (!this.rooms.findById(id)) {
            throw notFound('ROOM_NOT_FOUND', '找不到這個房間', { roomId: id });
        }
    }

    // 修改名稱時，改成自己原本的名稱不算重複
    private ensureNameAvailable(name: string, exceptId?: number) {
        const existing = this.rooms.findByName(name);
        if (existing && existing.id !== exceptId) {
            throw conflict('ROOM_NAME_TAKEN', '已經有同名的房間', { name });
        }
    }
}
