import type { Appliance } from '../../appliances/appliances.js';

// 自動恢復用電時的緩衝，避免反覆開關
export const RESTORE_MARGIN = 200;

export function currentPower(appliance: Appliance): number {
    if (appliance.state === 'on') return appliance.ratedPower;
    if (appliance.state === 'reduced') return appliance.reducedPower ?? 0;
    return 0;
}

export function totalPower(appliances: Appliance[]): number {
    return appliances.reduce((sum, appliance) => sum + currentPower(appliance), 0);
}