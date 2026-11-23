import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthDto } from './status/dto/status.dto.js';

@ApiTags('系統')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: '確認後端運作', description: '只確認伺服器有回應，不代表資料庫或裝置狀態正常。' })
  @ApiOkResponse({ type: HealthDto })
  health() {
    return { status: 'ok' };
  }
}
