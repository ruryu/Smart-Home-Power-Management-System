import { Body, Controller, HttpCode, Post, Put } from '@nestjs/common';
import { validationError } from '../common/api-error.js';
import { asObject, isPositiveInteger } from '../common/validation.js';
import { StatusService } from '../status/status.service.js';
import { SimulationService } from './simulation.service.js';

@Controller('simulation')
export class SimulationController {
    constructor(
        private readonly simulation: SimulationService,
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
}
