import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody } from './api-error.js';

function isApiErrorBody(body: unknown): body is ApiErrorBody {
    return typeof body === 'object' && body !== null && 'code' in body && 'message' in body;
}

// 把所有錯誤統一成 { code, message, details }，包含 NestJS 自己丟出的錯誤
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();

        if (!(exception instanceof HttpException)) {
            this.logger.error(exception);
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                code: 'INTERNAL_ERROR',
                message: '伺服器發生錯誤',
                details: null,
            } satisfies ApiErrorBody);
            return;
        }

        const status = exception.getStatus();
        const body = exception.getResponse();
        if (isApiErrorBody(body)) {
            response.status(status).json({ code: body.code, message: body.message, details: body.details ?? null });
            return;
        }

        // NestJS 內建的錯誤，例如找不到路徑、JSON 格式錯誤
        const original = typeof body === 'object' && body !== null && 'message' in body ? body.message : body;
        let error: ApiErrorBody;
        if (status === HttpStatus.NOT_FOUND) {
            error = { code: 'NOT_FOUND', message: '找不到這個 API', details: original };
        } else if (status === HttpStatus.BAD_REQUEST) {
            error = { code: 'VALIDATION_ERROR', message: '傳入的資料格式不正確', details: original };
        } else {
            error = { code: 'HTTP_ERROR', message: exception.message, details: original };
        }
        response.status(status).json(error);
    }
}
