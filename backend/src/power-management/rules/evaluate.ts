import type { Appliance } from '../../appliances/appliances.js';
import { currentPower, RESTORE_MARGIN, totalPower } from './power.js';

// 規則代號對應 Proposal：B1 超標調整、B2 自動恢復、B3 舒適保護、B4 使用者優先、B5 故障處理
export type Rule = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';

export interface Decision {
    rule: Rule;
    applianceId: number | null;
    action: string;
    reason: string;
}

export interface EvaluationContext {
    powerLimit: number;
}

export interface EvaluationResult {
    appliances: Appliance[];
    decisions: Decision[];
}

// 根據使用者的要求和用電上限，決定每台裝置的實際狀態。
// 不碰資料庫，傳入目前的裝置，回傳調整後的裝置和系統做的決定。
export function evaluate(input: Appliance[], context: EvaluationContext): EvaluationResult {
    const appliances = input.map((appliance) => ({ ...appliance }));
    const decisions: Decision[] = [];
    // 上一次計算就已經無法解決（超標而且沒有能調整的裝置），這次就不重複記錄
    const wasUnresolved = totalPower(input) > context.powerLimit && !input.some(canAdjust);

    applyRequests(appliances);
    const adjusted = reduceLoad(appliances, context, decisions);
    restore(appliances, context, adjusted, decisions);
    reportUnresolvedOverload(appliances, context, wasUnresolved, decisions);

    return { appliances, decisions };
}

// 依照使用者的開關要求更新狀態；已被系統調整的裝置先維持原狀
function applyRequests(appliances: Appliance[]) {
    for (const appliance of appliances) {
        if (appliance.state === 'faulted') continue;
        if (!appliance.requestedOn) {
            if (appliance.state !== 'off') {
                appliance.state = 'off';
                appliance.reason = null;
            }
            continue;
        }
        if (appliance.state === 'off') {
            appliance.state = 'on';
            appliance.reason = null;
        }
    }
}

function canAdjust(appliance: Appliance): boolean {
    return appliance.adjustment !== 'none' && appliance.state === 'on';
}

// 超標調整：總用電超過上限時，依調整順序延後或降載，降到上限以內就停止
function reduceLoad(appliances: Appliance[], context: EvaluationContext, decisions: Decision[]): Set<number> {
    const adjusted = new Set<number>();
    const limit = context.powerLimit;
    const candidates = appliances
        .filter(canAdjust)
        .sort((a, b) => (a.adjustmentOrder ?? 0) - (b.adjustmentOrder ?? 0));

    for (const appliance of candidates) {
        const total = totalPower(appliances);
        if (total <= limit) break;

        if (appliance.adjustment === 'delay') {
            appliance.state = 'delayed';
            appliance.reason = `總用電超過上限 ${limit}W，已延後`;
            decisions.push({
                rule: 'B1',
                applianceId: appliance.id,
                action: 'delay',
                reason: `總用電 ${total}W 超過上限 ${limit}W，延後 ${appliance.name}`,
            });
        } else {
            appliance.state = 'reduced';
            appliance.reason = `總用電超過上限 ${limit}W，已降載至 ${appliance.reducedPower}W`;
            decisions.push({
                rule: 'B1',
                applianceId: appliance.id,
                action: 'reduce',
                reason: `總用電 ${total}W 超過上限 ${limit}W，${appliance.name} 降載至 ${appliance.reducedPower}W`,
            });
        }
        adjusted.add(appliance.id);
    }
    return adjusted;
}

// 自動恢復：依調整的相反順序恢復，恢復後總用電不能超過「上限 − 200W」；
// 超過就跳過，試下一台。這次才剛被調整的裝置不恢復。
function restore(
    appliances: Appliance[],
    context: EvaluationContext,
    adjusted: Set<number>,
    decisions: Decision[],
) {
    const threshold = context.powerLimit - RESTORE_MARGIN;
    const candidates = appliances
        .filter(
            (appliance) =>
                appliance.requestedOn &&
                (appliance.state === 'delayed' || appliance.state === 'reduced') &&
                !adjusted.has(appliance.id),
        )
        .sort((a, b) => (b.adjustmentOrder ?? 0) - (a.adjustmentOrder ?? 0));

    for (const appliance of candidates) {
        const after = totalPower(appliances) + appliance.ratedPower - currentPower(appliance);
        if (after > threshold) continue;

        appliance.state = 'on';
        appliance.reason = '用電已下降，已自動恢復';
        decisions.push({
            rule: 'B2',
            applianceId: appliance.id,
            action: 'restore',
            reason: `恢復後總用電 ${after}W 未超過 ${threshold}W，恢復 ${appliance.name}`,
        });
    }
}

// 能調整的都調整了還是超標，記錄無法解決的超標
function reportUnresolvedOverload(
    appliances: Appliance[],
    context: EvaluationContext,
    wasUnresolved: boolean,
    decisions: Decision[],
) {
    const total = totalPower(appliances);
    if (total <= context.powerLimit || wasUnresolved) return;

    decisions.push({
        rule: 'B1',
        applianceId: null,
        action: 'overload-unresolved',
        reason: `調整後總用電 ${total}W 仍超過上限 ${context.powerLimit}W，超出 ${total - context.powerLimit}W`,
    });
}
