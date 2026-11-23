import { ApiProperty } from '@nestjs/swagger';
import type { ApiErrorBody } from '../api-error.js';

export class ApiErrorDto implements ApiErrorBody {
    @ApiProperty({ description: '錯誤種類，前端用來判斷要怎麼處理', example: 'ROOM_NOT_FOUND' })
    code: string;

    @ApiProperty({ description: '給使用者看的中文說明', example: '找不到這個房間' })
    message: string;

    @ApiProperty({
        description: '補充資料；VALIDATION_ERROR 時是錯誤原因清單',
        nullable: true,
        oneOf: [{ type: 'object' }, { type: 'array', items: { type: 'string' } }],
        example: { roomId: 99 },
    })
    details: unknown;
}
