import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBody, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PowerRequestDto, PriorityRequestDto } from '../appliances/dto/appliance.dto.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import {
    APPLIANCE_FAULTED,
    APPLIANCE_NOT_FOUND,
    ApiErrors,
    INVALID_ID,
    invalidBody,
} from '../common/swagger/api-errors.decorator.js';
import { parseBooleanField } from '../common/validation.js';
import { StatusDto } from '../status/dto/status.dto.js';
import { StatusService } from '../status/status.service.js';
import { PowerManagementService } from './power-management.service.js';

// 會改變用電的裝置操作。刪除裝置也放在這裡，因為刪除後要重新計算用電
@Controller('appliances')
export class PowerManagementController {
    constructor(
        private readonly power: PowerManagementService,
        private readonly status: StatusService,
    ) {}

    @Put(':id/power')
    @ApiTags('控制裝置')
    @ApiOperation({
        summary: '開啟、關閉裝置',
        description: [
            '可能連帶調整其他裝置，所以回傳完整狀態，前端直接用回傳結果重畫畫面。',
            '',
            '- 開啟後超過上限：依調整順序延後或降載，降到上限以內就停止；剛開啟的這台也可能被延後。',
            '- 關閉後用電下降：依調整的相反順序自動恢復，恢復後總用電會超過 restoreThreshold 的就跳過。',
            '- 重複傳相同的值不算錯誤。',
        ].join('\n'),
    })
    @ApiParam({ name: 'id', type: Number, example: 5 })
    @ApiBody({ type: PowerRequestDto })
    @ApiOkResponse({ type: StatusDto })
    @ApiErrors(
        invalidBody('傳入的資料格式不正確', ['on 必須是 true 或 false'], 'on 不是 boolean'),
        INVALID_ID,
        APPLIANCE_NOT_FOUND,
        APPLIANCE_FAULTED,
        {
            status: 409,
            code: 'UNRESOLVED_OVERLOAD',
            message: '目前用電已超過上限且無法再調整，暫時不能開啟裝置',
            details: { overload: 100 },
            when: '目前已超標且無法解決，拒絕開啟',
        },
    )
    setPower(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        const on = parseBooleanField(body, 'on');
        this.power.setPower(id, on);
        return this.status.getStatus();
    }

    @Put(':id/priority')
    @ApiTags('控制裝置')
    @ApiOperation({
        summary: '指定、取消優先',
        description: [
            '優先的裝置在超標時不會被延後或降載。',
            '',
            '- 接受條件：不能調整的裝置 + 所有優先裝置 + 這台 + 可降載裝置的降載後用電，不超過上限。舒適保護啟動時冷氣用額定用電計算。',
            '- 接受後如果這台正被延後或降載，會立刻恢復。',
            '- 之後室溫或用電上限改變造成衝突時，從最近指定的優先開始撤銷。',
        ].join('\n'),
    })
    @ApiParam({ name: 'id', type: Number, example: 5 })
    @ApiBody({ type: PriorityRequestDto })
    @ApiOkResponse({ type: StatusDto })
    @ApiErrors(
        invalidBody('傳入的資料格式不正確', ['enabled 必須是 true 或 false'], 'enabled 不是 boolean'),
        INVALID_ID,
        APPLIANCE_NOT_FOUND,
        APPLIANCE_FAULTED,
        {
            status: 409,
            code: 'INSUFFICIENT_POWER',
            message: '指定為優先後一定會超過上限，不足 1100W',
            details: { shortfall: 1100 },
            when: '指定之後一定會超過上限',
        },
    )
    setPriority(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        const enabled = parseBooleanField(body, 'enabled');
        this.power.setPriority(id, enabled);
        return this.status.getStatus();
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiTags('管理裝置')
    @ApiOperation({
        summary: '刪除裝置',
        description: '開啟中的裝置也可以刪除。刪除後會自動恢復被調整過的裝置，前端要重新呼叫 GET /api/status。',
    })
    @ApiParam({ name: 'id', type: Number, example: 6 })
    @ApiNoContentResponse({ description: '刪除成功，沒有內容' })
    @ApiErrors(INVALID_ID, APPLIANCE_NOT_FOUND)
    delete(@Param('id', ParseIdPipe) id: number) {
        this.power.deleteAppliance(id);
    }
}
