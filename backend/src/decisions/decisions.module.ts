import { Module } from '@nestjs/common';
import { DecisionsRepository } from './decisions.repository.js';

@Module({
    providers: [DecisionsRepository],
    exports: [DecisionsRepository],
})
export class DecisionsModule {}
