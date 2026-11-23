import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
    ApiBody,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { conflict, notFound } from '../common/api-error.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { ApiErrors, INVALID_ID, invalidBody, ROOM_NOT_FOUND, type ErrorExample } from '../common/swagger/api-errors.decorator.js';
import { RoomDto, RoomNameDto } from './dto/room.dto.js';
import { parseRoomName } from './room-input.js';
import { RoomsRepository } from './rooms.repository.js';

const EMPTY_NAME = invalidBody('房間設定不正確', ['name 不可為空'], 'name 是空的');
const NAME_TAKEN: ErrorExample = {
    status: 409,
    code: 'ROOM_NAME_TAKEN',
    message: '已經有同名的房間',
    details: { name: 'Kitchen' },
    when: '名稱跟其他房間重複',
};

@ApiTags('管理房間')
@Controller('rooms')
export class RoomsController {
    constructor(private readonly rooms: RoomsRepository) {}

    @Get()
    @ApiOperation({ summary: '房間清單', description: '依 id 排序。' })
    @ApiOkResponse({ type: [RoomDto] })
    findAll() {
        return this.rooms.findAll();
    }

    @Post()
    @ApiOperation({ summary: '新增房間' })
    @ApiBody({ type: RoomNameDto })
    @ApiCreatedResponse({ type: RoomDto })
    @ApiErrors(EMPTY_NAME, NAME_TAKEN)
    create(@Body() body: unknown) {
        const name = parseRoomName(body);
        this.ensureNameAvailable(name);
        return this.rooms.create(name);
    }

    @Patch(':id')
    @ApiOperation({ summary: '修改房間名稱', description: '改成自己原本的名稱不算重複。' })
    @ApiParam({ name: 'id', type: Number, example: 3 })
    @ApiBody({ type: RoomNameDto })
    @ApiOkResponse({ type: RoomDto })
    @ApiErrors(EMPTY_NAME, INVALID_ID, ROOM_NOT_FOUND, NAME_TAKEN)
    rename(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        this.ensureRoomExists(id);
        const name = parseRoomName(body);
        this.ensureNameAvailable(name, id);
        return this.rooms.rename(id, name);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: '刪除房間', description: '房間裡還有裝置時不能刪除。' })
    @ApiParam({ name: 'id', type: Number, example: 3 })
    @ApiNoContentResponse({ description: '刪除成功，沒有內容' })
    @ApiErrors(INVALID_ID, ROOM_NOT_FOUND, {
        status: 409,
        code: 'ROOM_NOT_EMPTY',
        message: '房間裡還有裝置，要先移走或刪除裝置',
        details: { roomId: 5, applianceCount: 2 },
        when: '房間裡還有裝置',
    })
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
