import { Injectable, PipeTransform } from '@nestjs/common';
import { validationError } from './api-error.js';

// 把路徑中的 :id 轉成正整數，格式不對就回傳 400
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
    transform(value: string): number {
        const id = Number(value);
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
            throw validationError('路徑中的 id 必須是正整數', { id: value });
        }
        return id;
    }
}
