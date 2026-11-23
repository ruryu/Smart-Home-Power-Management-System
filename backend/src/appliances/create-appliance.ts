import { validationError } from '../common/api-error.js';
import { asObject, isNonEmptyString, isPositiveInteger } from '../common/validation.js';
import { ADJUSTMENTS, type Adjustment } from './appliances.js';

export interface CreateApplianceInput {
    roomId: number;
    name: string;
    ratedPower: number;
    adjustment: Adjustment;
    reducedPower: number | null;
}

export function parseCreateAppliance(body: unknown): CreateApplianceInput {
    const input = asObject(body);
    const errors: string[] = [];

    if (!isPositiveInteger(input.roomId)) errors.push('roomId 須為正整數');
    if (!isNonEmptyString(input.name)) errors.push('name 不可為空');
    if (!isPositiveInteger(input.ratedPower)) errors.push('ratedPower 須為正整數');
    if (!ADJUSTMENTS.includes(input.adjustment as Adjustment)) {
        errors.push('adjustment 必須是none、delay 或是 reduce');
    }

    const reducedPower = input.reducedPower ?? null;
    if (input.adjustment === 'reduce') {
        if (!isPositiveInteger(reducedPower) || reducedPower >= (input.ratedPower as number)) {
            errors.push('reducedPower 必須是正整數，並且小於ratedPower');
        }
    } else if (reducedPower !== null) {
        errors.push('只有adjustment 是reduce 時才能設定 reducedPower');
    }

    if (errors.length > 0) {
        throw validationError('裝置設定不正確', errors);
    }

    return {
        roomId: input.roomId as number,
        name: (input.name as string).trim(),
        ratedPower: input.ratedPower as number,
        adjustment: input.adjustment as Adjustment,
        reducedPower: reducedPower as number | null,
    };
}
