import { Controller, Get, Query } from '@nestjs/common';
import { validationError } from '../common/api-error.js';
import { DecisionsRepository } from './decisions.repository.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Controller('decisions')
export class DecisionsController {
    constructor(private readonly decisions: DecisionsRepository) {}

    @Get()
    findRecent(@Query('limit') limitParam?: string) {
        const limit = limitParam === undefined ? DEFAULT_LIMIT : Number(limitParam);
        if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
            throw validationError('傳入的資料格式不正確', [`limit 必須是 1 到 ${MAX_LIMIT} 的整數`]);
        }
        return this.decisions.findRecent(limit);
    }
}
