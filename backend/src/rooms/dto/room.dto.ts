import { ApiProperty } from '@nestjs/swagger';
import type { Room } from '../room.js';

export class RoomDto implements Room {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ description: '名稱，不會跟其他房間重複', example: 'Living Room A' })
    name: string;
}

export class RoomNameDto {
    @ApiProperty({ description: '不能是空字串，不能跟其他房間重複', example: 'Study' })
    name: string;
}
