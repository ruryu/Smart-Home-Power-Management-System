import { validationError } from './api-error.js';

export function isPositiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) > 0;
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

// 把 body 當成物件讀取；不是物件時當成空物件
export function asObject(body: unknown): Record<string, unknown> {
    return typeof body === 'object' && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
}

export function parseBooleanField(body: unknown, field: string): boolean {
    const value = asObject(body)[field];
    if (typeof value !== 'boolean') {
        throw validationError('傳入的資料格式不正確', [`${field} 必須是 true 或 false`]);
    }
    return value;
}
