import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common';
import { validationError } from '../common/api-error.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { asObject, isPositiveInteger } from '../common/validation.js';
import { PowerManagementService } from '../power-management/power-management.service.js';
import { StatusService } from '../status/status.service.js';
import { SimulationService } from './simulation.service.js';

@Controller('simulation')
export class SimulationController {
    constructor(
        private readonly simulation: SimulationService,
        private readonly power: PowerManagementService,
        private readonly status: StatusService,
    ) {}

    @Post('reset')
    @HttpCode(200)
    reset() {
        this.simulation.reset();
        return this.status.getStatus();
    }

    @Put('temperature')
    setTemperature(@Body() body: unknown) {
        const { indoorTemperature } = asObject(body);
        if (typeof indoorTemperature !== 'number' || !Number.isFinite(indoorTemperature)) {
            throw validationError('傳入的資料格式不正確', ['indoorTemperature 必須是數字']);
        }
        this.simulation.setIndoorTemperature(indoorTemperature);
        return this.status.getStatus();
    }

    @Put('power-limit')
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
    repair(@Param('id', ParseIdPipe) id: number) {
        this.power.repair(id);
        return this.status.getStatus();
    }
}
