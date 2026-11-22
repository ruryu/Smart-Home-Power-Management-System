import { validationError } from '../common/api-error.js';
import { asObject, isNonEmptyString } from '../common/validation.js';

// 新增和修改房間都只有 name 一個欄位
export function parseRoomName(body: unknown): string {
    const input = asObject(body);
    if (!isNonEmptyString(input.name)) {
        throw validationError('房間設定不正確', ['name 不可為空']);
    }
    return input.name.trim();
}
