import type { Appliance } from '../../appliances/appliances.js';

// 使用者優先：假設這台也變成優先，算出「一定要用的電」。
// 不能調整的、優先的裝置用額定用電；可降載的用降載後用電（舒適保護啟動時用額定用電）；可延後的不算。
// 超過上限的部分就是不足的瓦數，0 代表可以接受。
export function priorityShortfall(
    appliances: Appliance[],
    candidateId: number,
    powerLimit: number,
    comfortActive = false,
): number {
    const required = appliances.reduce((sum, appliance) => {
        if (appliance.state === 'faulted') return sum;
        if (appliance.id === candidateId || appliance.priorityOrder !== null) return sum + appliance.ratedPower;
        if (!appliance.requestedOn) return sum;
        if (appliance.adjustment === 'none') return sum + appliance.ratedPower;
        if (appliance.adjustment === 'reduce') {
            return sum + (comfortActive ? appliance.ratedPower : (appliance.reducedPower ?? 0));
        }
        return sum;
    }, 0);
    return Math.max(0, required - powerLimit);
}
