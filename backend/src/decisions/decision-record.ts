import type { Rule } from '../power-management/rules/evaluate.js';

export const RULE_NAMES: Record<Rule, string> = {
    B1: '超標調整',
    B2: '自動恢復',
    B3: '舒適保護',
    B4: '使用者優先',
    B5: '故障處理',
};

export interface DecisionRecord {
    id: number;
    createdAt: string;
    rule: Rule;
    ruleName: string;
    applianceId: number | null;
    applianceName: string | null;
    action: string;
    reason: string;
}
