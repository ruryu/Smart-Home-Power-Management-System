import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { validationError } from '../common/api-error.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { APPLIANCE_NOT_FOUND, ApiErrors, INVALID_ID, invalidBody } from '../common/swagger/api-errors.decorator.js';
import { asObject, isPositiveInteger } from '../common/validation.js';
import { PowerManagementService } from '../power-management/power-management.service.js';
import { StatusDto } from '../status/dto/status.dto.js';
import { StatusService } from '../status/status.service.js';
import { PowerLimitRequestDto, TemperatureRequestDto, UsageRequestDto } from './dto/simulation.dto.js';
import { SimulationService } from './simulation.service.js';

@ApiTags('測試介面')
@Controller('simulation')
export class SimulationController {
    constructor(
        private readonly simulation: SimulationService,
        private readonly power: PowerManagementService,
        private readonly status: StatusService,
    ) {}

    @Post('reset')
    @HttpCode(200)
    @ApiOperation({
        summary: '重置',
        description: '清空所有資料和決策紀錄，回到初始狀態：上限 5000W、室溫 26°C、6 個房間、6 台裝置。',
    })
    @ApiOkResponse({ type: StatusDto, description: '完整狀態' })
    reset() {
        this.simulation.reset();
        return this.status.getStatus();
    }

    @Put('temperature')
    @ApiOperation({
        summary: '修改室溫',
        description: [
            '用來測試舒適保護。',
            '',
            '- 室溫超過舒適門檻（28°C，剛好 28°C 不算）時，冷氣不能降載；已降載的恢復正常，超標的話改延後其他裝置，用上限判斷。',
            '- 恢復冷氣後如果優先裝置衝突，撤銷最近指定的優先。',
        ].join('\n'),
    })
    @ApiBody({ type: TemperatureRequestDto })
    @ApiErrors(invalidBody('傳入的資料格式不正確', ['indoorTemperature 必須是數字'], 'indoorTemperature 不是數字'))
    @ApiOkResponse({ type: StatusDto, description: '完整狀態' })
    setTemperature(@Body() body: unknown) {
        const { indoorTemperature } = asObject(body);
        if (typeof indoorTemperature !== 'number' || !Number.isFinite(indoorTemperature)) {
            throw validationError('傳入的資料格式不正確', ['indoorTemperature 必須是數字']);
        }
        this.simulation.setIndoorTemperature(indoorTemperature);
        return this.status.getStatus();
    }

    @Put('power-limit')
    @ApiOperation({
        summary: '修改用電上限',
        description: [
            '用來重現無法解決的超標，restoreThreshold 會跟著變成上限 − 200。',
            '',
            '- 例如改成 1000W：冷氣降載後還有 1100W，unresolvedOverload 變成 100。',
            '- 上限降低造成優先衝突時，撤銷最近指定的優先。',
        ].join('\n'),
    })
    @ApiBody({ type: PowerLimitRequestDto })
    @ApiErrors(invalidBody('傳入的資料格式不正確', ['powerLimit 須為正整數'], 'powerLimit 不是正整數'))
    @ApiOkResponse({ type: StatusDto, description: '完整狀態' })
    setPowerLimit(@Body() body: unknown) {
        const { powerLimit } = asObject(body);
        if (!isPositiveInteger(powerLimit)) {
            throw validationError('傳入的資料格式不正確', ['powerLimit 須為正整數']);
        }
        this.simulation.setPowerLimit(powerLimit);
        return this.status.getStatus();
    }

    // 模擬讀到某台裝置的用電，超過額定用電的 150% 就會被判定故障
    @Post('appliances/:id/usage')
    @HttpCode(200)
    @ApiOperation({
        summary: '模擬裝置用電',
        description:
            '用來測試故障處理。power 超過額定用電的 150%（剛好 150% 不算）時，裝置變成 faulted、用電 0W、requestedOn 變成 false；沒超過就什麼都不改。',
    })
    @ApiParam({ name: 'id', type: Number, example: 5 })
    @ApiBody({ type: UsageRequestDto })
    @ApiErrors(
        invalidBody('傳入的資料格式不正確', ['power 必須是 0 以上的數字'], 'power 不是 0 以上的數字'),
        INVALID_ID,
        APPLIANCE_NOT_FOUND,
    )
    @ApiOkResponse({ type: StatusDto, description: '完整狀態' })
    reportUsage(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        const { power } = asObject(body);
        if (typeof power !== 'number' || !Number.isFinite(power) || power < 0) {
            throw validationError('傳入的資料格式不正確', ['power 必須是 0 以上的數字']);
        }
        this.power.reportUsage(id, power);
        return this.status.getStatus();
    }

    @Post('appliances/:id/repair')
    @HttpCode(200)
    @ApiOperation({ summary: '修復裝置', description: '修復後是 off，要由使用者重新開啟。' })
    @ApiParam({ name: 'id', type: Number, example: 5 })
    @ApiErrors(INVALID_ID, APPLIANCE_NOT_FOUND, {
        status: 409,
        code: 'APPLIANCE_NOT_FAULTED',
        message: '這個裝置沒有故障',
        details: { applianceId: 5 },
        when: '裝置沒有故障',
    })
    @ApiOkResponse({ type: StatusDto, description: '完整狀態' })
    repair(@Param('id', ParseIdPipe) id: number) {
        this.power.repair(id);
        return this.status.getStatus();
    }
}
