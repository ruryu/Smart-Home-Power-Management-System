import { Module } from '@nestjs/common';
import { AppliancesRepository } from './appliances.repository.js';

@Module({
    providers: [AppliancesRepository],
    exports: [AppliancesRepository],
})
export class AppliancesModule {}