import { Module } from '@nestjs/common';
import { DecisionsController } from './decisions.controller.js';
import { DecisionsRepository } from './decisions.repository.js';

@Module({
    controllers: [DecisionsController],
    providers: [DecisionsRepository],
    exports: [DecisionsRepository],
})
export class DecisionsModule {}
