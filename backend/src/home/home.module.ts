import { Module } from '@nestjs/common';
import { HomeRepository } from './home.repository.js';

@Module({
    providers: [HomeRepository],
    exports: [HomeRepository],
})
export class HomeModule {}