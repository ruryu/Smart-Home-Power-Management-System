import { ApiProperty } from '@nestjs/swagger';
import type { Rule } from '../../power-management/rules/evaluate.js';
import { RULE_NAMES, type DecisionRecord } from '../decision-record.js';

export class DecisionDto implements DecisionRecord {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ description: 'ISO 8601 時間（UTC）', example: '2026-11-22T08:00:00.000Z' })
    createdAt: string;

    @ApiProperty({
        enum: Object.keys(RULE_NAMES),
        description: 'B1 超標調整、B2 自動恢復、B3 舒適保護、B4 使用者優先、B5 故障處理',
        example: 'B1',
    })
    rule: Rule;

    @ApiProperty({ description: '規則名稱，前端顯示用', example: '超標調整' })
    ruleName: string;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: '相關裝置；跟整個家有關、或裝置已被刪除時為 null',
        example: 5,
    })
    applianceId: number | null;

    @ApiProperty({ type: String, nullable: true, example: 'Oven' })
    applianceName: string | null;

    @ApiProperty({
        description:
            'delay、reduce、overload-unresolved、reject、restore、comfort-restore、priority-accept、priority-reject、priority-cancel、priority-restore、priority-revoke、fault、repair',
        example: 'delay',
    })
    action: string;

    @ApiProperty({ description: '給使用者看的說明', example: '總用電 6600W 超過上限 5000W，延後 Oven' })
    reason: string;
}
