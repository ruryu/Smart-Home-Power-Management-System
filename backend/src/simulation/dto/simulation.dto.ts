import { ApiProperty } from '@nestjs/swagger';

export class TemperatureRequestDto {
    @ApiProperty({ description: '室溫（°C），超過舒適門檻 28°C 就啟動舒適保護', example: 29 })
    indoorTemperature: number;
}

export class PowerLimitRequestDto {
    @ApiProperty({ description: '用電上限（W），正整數', example: 1000 })
    powerLimit: number;
}

export class UsageRequestDto {
    @ApiProperty({ description: '模擬讀到的實際用電（W），0 以上；超過額定用電的 150% 就判定故障', example: 3001 })
    power: number;
}
