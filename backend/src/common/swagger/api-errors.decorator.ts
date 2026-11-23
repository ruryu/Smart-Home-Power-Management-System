import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorDto } from './api-error.dto.js';

export interface ErrorExample {
    status: 400 | 404 | 409;
    code: string;
    message: string;
    details?: unknown;
    when: string; // 什麼時候會發生
}

// 同一個狀態碼可能有好幾種 code，合併成一個回應並列出每種範例
export function ApiErrors(...errors: ErrorExample[]) {
    const statuses = [...new Set(errors.map((error) => error.status))];
    return applyDecorators(
        ...statuses.map((status) => {
            const group = errors.filter((error) => error.status === status);
            return ApiResponse({
                status,
                type: ApiErrorDto,
                description: group.map((error) => `\`${error.code}\`：${error.when}`).join('<br>'),
                examples: Object.fromEntries(
                    group.map((error, index) => [
                        // 同一個 code 可能出現好幾次（例如 VALIDATION_ERROR），用 when 區分
                        group.findIndex((other) => other.code === error.code) === index ? error.code : `${error.code}（${error.when}）`,
                        {
                            summary: error.when,
                            value: { code: error.code, message: error.message, details: error.details ?? null },
                        },
                    ]),
                ),
            });
        }),
    );
}

// 常用的錯誤範例
export const INVALID_ID: ErrorExample = {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: '路徑中的 id 必須是正整數',
    details: { id: 'abc' },
    when: '路徑中的 id 不是正整數',
};

export const APPLIANCE_NOT_FOUND: ErrorExample = {
    status: 404,
    code: 'APPLIANCE_NOT_FOUND',
    message: '找不到這個裝置',
    details: { applianceId: 99 },
    when: '找不到裝置',
};

export const ROOM_NOT_FOUND: ErrorExample = {
    status: 404,
    code: 'ROOM_NOT_FOUND',
    message: '找不到這個房間',
    details: { roomId: 99 },
    when: '找不到房間',
};

export const APPLIANCE_FAULTED: ErrorExample = {
    status: 409,
    code: 'APPLIANCE_FAULTED',
    message: '裝置故障中，要先到測試介面修復',
    details: { applianceId: 5 },
    when: '裝置故障中',
};

export function invalidBody(message: string, details: string[], when: string): ErrorExample {
    return { status: 400, code: 'VALIDATION_ERROR', message, details, when };
}
