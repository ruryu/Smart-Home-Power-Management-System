import { HttpException, HttpStatus } from '@nestjs/common';

// 所有錯誤回傳的格式，跟 docs/api.md 的 Error 一致
export interface ApiErrorBody {
    code: string;
    message: string;
    details: unknown;
}

export function apiError(status: HttpStatus, code: string, message: string, details: unknown = null) {
    return new HttpException({ code, message, details } satisfies ApiErrorBody, status);
}

export function validationError(message: string, details: unknown = null) {
    return apiError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', message, details);
}

export function notFound(code: string, message: string, details: unknown = null) {
    return apiError(HttpStatus.NOT_FOUND, code, message, details);
}

export function conflict(code: string, message: string, details: unknown = null) {
    return apiError(HttpStatus.CONFLICT, code, message, details);
}
