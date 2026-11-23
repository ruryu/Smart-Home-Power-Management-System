import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { validationError } from '../common/api-error.js';
import { ApiErrors, invalidBody } from '../common/swagger/api-errors.decorator.js';
import { DecisionsRepository } from './decisions.repository.js';
import { DecisionDto } from './dto/decision.dto.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@ApiTags('決策紀錄')
@Controller('decisions')
export class DecisionsController {
    constructor(private readonly decisions: DecisionsRepository) {}

    @Get()
    @ApiOperation({ summary: '決策紀錄', description: '系統做過的決定，最新的在前面。被拒絕的要求也會記錄。' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: `1 到 ${MAX_LIMIT} 的整數，預設 ${DEFAULT_LIMIT}` })
    @ApiOkResponse({ type: [DecisionDto] })
    @ApiErrors(invalidBody('傳入的資料格式不正確', [`limit 必須是 1 到 ${MAX_LIMIT} 的整數`], 'limit 不正確'))
    findRecent(@Query('limit') limitParam?: string) {
        const limit = limitParam === undefined ? DEFAULT_LIMIT : Number(limitParam);
        if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
            throw validationError('傳入的資料格式不正確', [`limit 必須是 1 到 ${MAX_LIMIT} 的整數`]);
        }
        return this.decisions.findRecent(limit);
    }
}
