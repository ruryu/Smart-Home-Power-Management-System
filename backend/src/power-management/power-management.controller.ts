import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { parseBooleanField } from '../common/validation.js';
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
    setPower(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
        const on = parseBooleanField(body, 'on');
        this.power.setPower(id, on);
        return this.status.getStatus();
    }

    @Delete(':id')
    @HttpCode(204)
    delete(@Param('id', ParseIdPipe) id: number) {
        this.power.deleteAppliance(id);
    }
}
