import type { Appliance } from '../../appliances/appliances.js';
import { priorityShortfall } from './priority.js';

function appliance(overrides: Partial<Appliance> & Pick<Appliance, 'id' | 'ratedPower'>): Appliance {
    return {
        roomId: 1,
        name: 'Test',
        reducedPower: null,
        adjustment: 'delay',
        adjustmentOrder: 1,
        requestedOn: true,
        state: 'on',
        priorityOrder: null,
        reason: null,
        ...overrides,
    };
}

describe('priorityShortfall', () => {
    // Proposal 範例：熱水器已是優先，再指定烤箱
    const appliances = [
        appliance({ id: 1, ratedPower: 200, adjustment: 'none', adjustmentOrder: null }),
        appliance({ id: 2, ratedPower: 100, adjustment: 'none', adjustmentOrder: null }),
        appliance({ id: 3, ratedPower: 1300, reducedPower: 800, adjustment: 'reduce', adjustmentOrder: 4 }),
        appliance({ id: 4, ratedPower: 3000, adjustmentOrder: 3, priorityOrder: 1 }),
        appliance({ id: 5, ratedPower: 2000, adjustmentOrder: 2, requestedOn: false, state: 'off' }),
        appliance({ id: 6, ratedPower: 500, adjustmentOrder: 1 }),
    ];

    it('Proposal 範例：需要 6100W，不足 1100W', () => {
        expect(priorityShortfall(appliances, 5, 5000)).toBe(1100);
    });

    it('可延後的裝置不算進一定要用的電，所以洗衣機可以指定', () => {
        // 200 + 100 + 800 + 3000 + 500 = 4600
        expect(priorityShortfall(appliances, 6, 5000)).toBe(0);
    });

    it('故障中的裝置不算', () => {
        const faulted = appliances.map((item) => (item.id === 4 ? { ...item, state: 'faulted' as const } : item));
        expect(priorityShortfall(faulted, 5, 5000)).toBe(0);
    });

    it('舒適保護啟動時，冷氣用額定用電計算', () => {
        // 200 + 100 + 1300 + 3000 + 500 = 5100，不足 100W
        expect(priorityShortfall(appliances, 6, 5000, true)).toBe(100);
    });
});
