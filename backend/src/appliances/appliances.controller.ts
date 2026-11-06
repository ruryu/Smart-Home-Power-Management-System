import { Controller, Get } from '@nestjs/common';
import { AppliancesRepository } from './appliances.repository.js';

@Controller('appliances')
export class AppliancesController {
    constructor(private readonly appliances: AppliancesRepository) {}

    @Get()
    findAll() {
        return this.appliances.findAll();
    }
}