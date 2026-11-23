import { ApiProperty } from '@nestjs/swagger';
import { ApplianceDto } from '../../appliances/dto/appliance.dto.js';
import { RoomDto } from '../../rooms/dto/room.dto.js';

export class ApplianceStatusDto extends ApplianceDto {
    @ApiProperty({ description: '這台裝置目前實際用電（W）', example: 0 })
    currentPower: number;
}

export class StatusDto {
    @ApiProperty({ description: '全家目前總用電（W）', example: 4600 })
    totalPower: number;

    @ApiProperty({ description: '用電上限（W）', example: 5000 })
    powerLimit: number;

    @ApiProperty({ description: '自動恢復時，總用電不能超過的值（上限 − 200）', example: 4800 })
    restoreThreshold: number;

    @ApiProperty({ description: '室溫（°C）', example: 26 })
    indoorTemperature: number;

    @ApiProperty({ description: '舒適門檻（°C），室溫超過這個值就啟動舒適保護', example: 28 })
    comfortThreshold: number;

    @ApiProperty({ description: '舒適保護是否啟動中；啟動時冷氣不會被降載', example: false })
    comfortActive: boolean;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: '調整完仍超過上限時，超出的瓦數；沒有超標是 null',
        example: null,
    })
    unresolvedOverload: number | null;

    @ApiProperty({ type: [RoomDto], description: '所有房間，依 id 排序' })
    rooms: RoomDto[];

    @ApiProperty({ type: [ApplianceStatusDto], description: '所有裝置，依 id 排序' })
    appliances: ApplianceStatusDto[];

    @ApiProperty({
        type: [String],
        description: '要顯示給使用者看的警告文字，沒有就是空陣列',
        example: ['為了不超過上限 5000W，系統已調整：Oven（延後）'],
    })
    warnings: string[];
}

export class HealthDto {
    @ApiProperty({ example: 'ok' })
    status: string;
}
