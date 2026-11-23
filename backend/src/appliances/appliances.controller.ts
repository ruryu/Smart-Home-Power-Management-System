import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { notFound } from '../common/api-error.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import {
    APPLIANCE_NOT_FOUND,
    ApiErrors,
    INVALID_ID,
    invalidBody,
    ROOM_NOT_FOUND,
} from '../common/swagger/api-errors.decorator.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';
import { AppliancesRepository } from './appliances.repository.js';
import { parseCreateAppliance } from './create-appliance.js';
import { ApplianceDto, CreateApplianceDto, UpdateApplianceDto } from './dto/appliance.dto.js';
import { parseUpdateAppliance } from './update-appliance.js';

@ApiTags('管理裝置')
@Controller('appliances')
export class AppliancesController {
    constructor(
        private readonly appliances: AppliancesRepository,
        private readonly rooms: RoomsRepository,
    ) {}

    @Get()
    @ApiOperation({ summary: '裝置清單', description: '依 id 排序。不含 currentPower，要顯示用電請用 GET /api/status。' })
    @ApiOkResponse({ type: [ApplianceDto] })
    findAll() {
        return this.appliances.findAll();
    }

    @Post()
    @ApiOperation({
        summary: '新增裝置',
        description: '新裝置一律是 off、requestedOn: false。adjustmentOrder 自動排在最後；adjustment 是 none 時為 null。',
    })
    @ApiBody({ type: CreateApplianceDto })
    @ApiCreatedResponse({ type: ApplianceDto })
    @ApiErrors(
        invalidBody('裝置設定不正確', ['name 不可為空', 'ratedPower 須為正整數'], '欄位不符合規則'),
        ROOM_NOT_FOUND,
    )
    create(@Body() body: unknown) {
        const input = parseCreateAppliance(body);
        this.ensureRoomExists(input.roomId);
        return this.appliances.create(input);
    }

    @Patch(':id')
    @ApiOperation({
        summary: '修改裝置',
        description: '只能修改 name 和 roomId，只傳要改的欄位。用電相關的欄位不開放修改，要改請刪除後重新新增。',
    })
    @ApiParam({ name: 'id', type: Number, example: 5 })
    @ApiBody({ type: UpdateApplianceDto })
    @ApiOkResponse({ type: ApplianceDto })
    @ApiErrors(
        invalidBody('裝置設定不正確', ['ratedPower 不能修改，只能修改 name 和 roomId'], '欄位不符合規則、沒有傳欄位，或傳了不能修改的欄位'),
        INVALID_ID,
        APPLIANCE_NOT_FOUND,
        ROOM_NOT_FOUND,
    )
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
