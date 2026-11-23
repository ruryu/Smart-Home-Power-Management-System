export const APPLIANCE_STATES = ['off', 'on', 'delayed', 'reduced', 'faulted'] as const;
export const ADJUSTMENTS = ['none', 'delay', 'reduce'] as const;

export type ApplianceState = (typeof APPLIANCE_STATES)[number];
export type Adjustment = (typeof ADJUSTMENTS)[number];

export interface Appliance {
    id: number;
    roomId: number;
    name: string,
    ratedPower: number,
    reducedPower: number | null;
    adjustment: Adjustment;
    adjustmentOrder: number | null;
    requestedOn: boolean;
    state: ApplianceState;
    priorityOrder: number | null;
    reason: string | null; // 系統為什麼讓裝置處於目前狀態
}
