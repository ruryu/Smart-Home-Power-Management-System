export type ApplianceState = 'off' | 'on' | 'delayed' | 'reduced' | 'faulted';
export type Adjustment = 'none' | 'delay' | 'reduce';

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
}