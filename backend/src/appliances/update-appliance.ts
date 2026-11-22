import { validationError } from '../common/api-error.js';
import { asObject, isNonEmptyString, isPositiveInteger } from '../common/validation.js';

export interface UpdateApplianceInput {
    name?: string;
    roomId?: number;
}

// 用電相關的欄位會影響用電計算，所以只開放修改名稱和房間
const EDITABLE_FIELDS = ['name', 'roomId'];

export function parseUpdateAppliance(body: unknown): UpdateApplianceInput {
    const input = asObject(body);
    const errors: string[] = [];
    const keys = Object.keys(input);

    if (keys.length === 0) errors.push('至少要傳一個要修改的欄位');
    for (const key of keys) {
        if (!EDITABLE_FIELDS.includes(key)) errors.push(`${key} 不能修改，只能修改 name 和 roomId`);
    }
    if ('name' in input && !isNonEmptyString(input.name)) errors.push('name 不可為空');
    if ('roomId' in input && !isPositiveInteger(input.roomId)) errors.push('roomId 須為正整數');

    if (errors.length > 0) {
        throw validationError('裝置設定不正確', errors);
    }

    const result: UpdateApplianceInput = {};
    if ('name' in input) result.name = (input.name as string).trim();
    if ('roomId' in input) result.roomId = input.roomId as number;
    return result;
}
