import { ApiProperty } from '@nestjs/swagger';
import { ADJUSTMENTS, APPLIANCE_STATES, type Adjustment, type Appliance, type ApplianceState } from '../appliances.js';

// 只給 Swagger 文件用，實際的型別是 Appliance
export class ApplianceDto implements Appliance {
    @ApiProperty({ example: 5 })
    id: number;

    @ApiProperty({ description: '所在房間的 id', example: 5 })
    roomId: number;

    @ApiProperty({ example: 'Oven' })
    name: string;

    @ApiProperty({ description: '額定用電（W），正常開啟時的用電', example: 2000 })
    ratedPower: number;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: '降載後用電（W）；只有 adjustment 是 reduce 才有值',
        example: null,
    })
    reducedPower: number | null;

    @ApiProperty({ enum: ADJUSTMENTS, description: '超標時的調整方式：不調整 / 延後 / 降載', example: 'delay' })
    adjustment: Adjustment;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: '超標時的調整順序，數字小的先調整；adjustment 是 none 時為 null',
        example: 2,
    })
    adjustmentOrder: number | null;

    @ApiProperty({ description: '使用者是否要求開啟', example: true })
    requestedOn: boolean;

    @ApiProperty({
        enum: APPLIANCE_STATES,
        description:
            '實際狀態：off 關閉、on 正常開啟、delayed 因超標被延後、reduced 因超標被降載、faulted 故障',
        example: 'delayed',
    })
    state: ApplianceState;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: '使用者優先的順序，數字越大代表越晚指定；null 代表不是優先裝置',
        example: null,
    })
    priorityOrder: number | null;

    @ApiProperty({
        type: String,
        nullable: true,
        description: '系統為什麼讓這台處於目前狀態；使用者自己操作的結果時為 null',
        example: '總用電超過上限 5000W，已延後',
    })
    reason: string | null;
}

export class CreateApplianceDto {
    @ApiProperty({ description: '存在的房間 id', example: 3 })
    roomId: number;

    @ApiProperty({ description: '不能是空字串，前後空白會被去掉', example: 'Fan' })
    name: string;

    @ApiProperty({ description: '額定用電（W），正整數', example: 60 })
    ratedPower: number;

    @ApiProperty({ enum: ADJUSTMENTS, example: 'delay' })
    adjustment: Adjustment;

    @ApiProperty({
        required: false,
        description: '只有 adjustment 是 reduce 時要填；正整數，而且小於 ratedPower',
        example: 30,
    })
    reducedPower?: number;
}

export class UpdateApplianceDto {
    @ApiProperty({ required: false, description: '不能是空字串', example: 'Big Fan' })
    name?: string;

    @ApiProperty({ required: false, description: '存在的房間 id', example: 4 })
    roomId?: number;
}

export class PowerRequestDto {
    @ApiProperty({ description: 'true 開啟，false 關閉', example: true })
    on: boolean;
}

export class PriorityRequestDto {
    @ApiProperty({ description: 'true 指定優先，false 取消優先', example: true })
    enabled: boolean;
}
