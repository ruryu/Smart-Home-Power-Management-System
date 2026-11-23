import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusDto } from './dto/status.dto.js';
import { StatusService } from './status.service.js';

@ApiTags('系統')
@Controller('status')
export class StatusController {
    constructor(private readonly status: StatusService) {}

    @Get()
    @ApiOperation({
        summary: '查看完整狀態',
        description: '回傳畫面需要的全部資料。前端每 1–2 秒呼叫一次更新畫面。',
    })
    @ApiOkResponse({ type: StatusDto })
    getStatus() {
        return this.status.getStatus()
    }
}
