import type { Appliance } from '../../appliances/appliances.js';
import { evaluate } from './evaluate.js';
import { totalPower } from './power.js';

// 跟 seed.ts 一樣的初始裝置
function initialAppliances(): Appliance[] {
    const base = { reason: null, priorityOrder: null };
    return [
        { ...base, id: 1, roomId: 5, name: 'Refrigerator', ratedPower: 200, reducedPower: null, adjustment: 'none', adjustmentOrder: null, requestedOn: true, state: 'on' },
        { ...base, id: 2, roomId: 1, name: 'Lights', ratedPower: 100, reducedPower: null, adjustment: 'none', adjustmentOrder: null, requestedOn: true, state: 'on' },
        { ...base, id: 3, roomId: 1, name: 'Air Conditioner', ratedPower: 1300, reducedPower: 800, adjustment: 'reduce', adjustmentOrder: 4, requestedOn: true, state: 'on' },
        { ...base, id: 4, roomId: 6, name: 'Water Heater', ratedPower: 3000, reducedPower: null, adjustment: 'delay', adjustmentOrder: 3, requestedOn: false, state: 'off' },
        { ...base, id: 5, roomId: 5, name: 'Oven', ratedPower: 2000, reducedPower: null, adjustment: 'delay', adjustmentOrder: 2, requestedOn: false, state: 'off' },
        { ...base, id: 6, roomId: 6, name: 'Washing Machine', ratedPower: 500, reducedPower: null, adjustment: 'delay', adjustmentOrder: 1, requestedOn: false, state: 'off' },
    ];
}

function withChanges(changes: Record<number, Partial<Appliance>>): Appliance[] {
    return initialAppliances().map((appliance) => ({ ...appliance, ...changes[appliance.id] }));
}

function states(appliances: Appliance[]) {
    return Object.fromEntries(appliances.map((appliance) => [appliance.name, appliance.state]));
}

const context = { powerLimit: 5000 };

describe('evaluate：開關要求', () => {
    it('使用者開啟後沒有超標，直接開啟', () => {
        const result = evaluate(withChanges({ 5: { requestedOn: true } }), context);
        expect(result.appliances[4].state).toBe('on');
        expect(totalPower(result.appliances)).toBe(3600);
        expect(result.decisions).toEqual([]);
    });

    it('使用者關閉被延後的裝置，狀態變成 off，原因清空', () => {
        const result = evaluate(
            withChanges({ 5: { requestedOn: false, state: 'delayed', reason: '總用電超過上限 5000W，已延後' } }),
            context,
        );
        expect(result.appliances[4]).toMatchObject({ state: 'off', reason: null });
    });

    it('不修改傳入的資料', () => {
        const input = withChanges({ 5: { requestedOn: true } });
        evaluate(input, context);
        expect(input[4].state).toBe('off');
    });
});

describe('evaluate：超標調整', () => {
    it('Proposal 範例：7100W 依序延後洗衣機和烤箱後降到 4600W', () => {
        const result = evaluate(
            withChanges({ 4: { requestedOn: true }, 5: { requestedOn: true }, 6: { requestedOn: true } }),
            context,
        );
        expect(states(result.appliances)).toMatchObject({
            'Washing Machine': 'delayed',
            Oven: 'delayed',
            'Water Heater': 'on',
            'Air Conditioner': 'on',
        });
        expect(totalPower(result.appliances)).toBe(4600);
        expect(result.decisions.map((decision) => [decision.rule, decision.applianceId, decision.action])).toEqual([
            ['B1', 6, 'delay'],
            ['B1', 5, 'delay'],
        ]);
        expect(result.appliances[4].reason).toBe('總用電超過上限 5000W，已延後');
    });

    it('延後的裝置都不夠時，最後才把冷氣降載', () => {
        const result = evaluate(
            withChanges({ 4: { requestedOn: true }, 5: { requestedOn: true } }),
            { powerLimit: 3000 },
        );
        // 1600 + 3000 + 2000 = 6600，延後烤箱、熱水器後剩 1600W，不需要降載冷氣
        expect(states(result.appliances)).toMatchObject({ Oven: 'delayed', 'Water Heater': 'delayed', 'Air Conditioner': 'on' });

        const tight = evaluate(withChanges({}), { powerLimit: 1500 });
        expect(tight.appliances[2]).toMatchObject({
            state: 'reduced',
            reason: '總用電超過上限 1500W，已降載至 800W',
        });
        expect(totalPower(tight.appliances)).toBe(1100);
    });

    it('剛好等於上限不調整', () => {
        const result = evaluate(withChanges({ 4: { requestedOn: true } }), { powerLimit: 4600 });
        expect(result.decisions).toEqual([]);
    });

    it('全部調整後仍超標，記錄無法解決的超標', () => {
        const result = evaluate(withChanges({}), { powerLimit: 1000 });
        expect(totalPower(result.appliances)).toBe(1100);
        expect(result.decisions.at(-1)).toEqual({
            rule: 'B1',
            applianceId: null,
            action: 'overload-unresolved',
            reason: '調整後總用電 1100W 仍超過上限 1000W，超出 100W',
        });
    });

    it('已經是無法解決的超標時，不重複記錄', () => {
        const first = evaluate(withChanges({}), { powerLimit: 1000 });
        const second = evaluate(first.appliances, { powerLimit: 1000 });
        expect(second.decisions).toEqual([]);
    });
});

describe('evaluate：自動恢復', () => {
    it('用電下降後，依調整的相反順序恢復', () => {
        const result = evaluate(
            withChanges({
                5: { requestedOn: true, state: 'delayed' },
                6: { requestedOn: true, state: 'delayed' },
            }),
            context,
        );
        // 1600W 時先恢復烤箱（順序 2）到 3600W，再恢復洗衣機（順序 1）到 4100W
        expect(states(result.appliances)).toMatchObject({ Oven: 'on', 'Washing Machine': 'on' });
        expect(result.decisions.map((decision) => decision.applianceId)).toEqual([5, 6]);
        expect(result.appliances[4].reason).toBe('用電已下降，已自動恢復');
    });

    it('恢復後會超過 4800W 就跳過，改試下一台', () => {
        const result = evaluate(
            withChanges({
                4: { requestedOn: true, state: 'delayed' },
                5: { requestedOn: true, state: 'on' },
                6: { requestedOn: true, state: 'delayed' },
            }),
            context,
        );
        // 目前 3600W：熱水器 +3000 = 6600 跳過；洗衣機 +500 = 4100 恢復
        expect(states(result.appliances)).toMatchObject({ 'Water Heater': 'delayed', 'Washing Machine': 'on' });
    });

    it('恢復後剛好 4800W 可以恢復，4900W 不行', () => {
        const ok = evaluate(
            withChanges({ 4: { requestedOn: true, state: 'on' }, 6: { requestedOn: true, state: 'delayed' } }),
            { powerLimit: 5000 },
        );
        // 4600 + 500 = 5100 > 4800，不恢復
        expect(ok.appliances[5].state).toBe('delayed');

        const exact = evaluate(
            withChanges({ 4: { requestedOn: true, state: 'on' }, 6: { requestedOn: true, state: 'delayed' } }),
            { powerLimit: 5300 },
        );
        // 4600 + 500 = 5100 = 5300 − 200，可以恢復
        expect(exact.appliances[5].state).toBe('on');
    });

    it('降載的冷氣在用電下降後恢復正常', () => {
        const result = evaluate(withChanges({ 3: { state: 'reduced' } }), context);
        expect(result.appliances[2]).toMatchObject({ state: 'on', reason: '用電已下降，已自動恢復' });
    });

    it('使用者手動關閉的裝置不會被恢復', () => {
        const result = evaluate(withChanges({ 5: { requestedOn: false, state: 'off' } }), context);
        expect(result.appliances[4].state).toBe('off');
    });

    it('同一次計算中剛被延後的裝置不會立刻恢復', () => {
        const result = evaluate(
            withChanges({ 4: { requestedOn: true }, 5: { requestedOn: true }, 6: { requestedOn: true } }),
            context,
        );
        expect(result.decisions.every((decision) => decision.rule === 'B1')).toBe(true);
    });
});

describe('evaluate：使用者優先', () => {
    it('超標時跳過優先裝置，改調整下一台', () => {
        const result = evaluate(
            withChanges({
                4: { requestedOn: true },
                5: { requestedOn: true },
                6: { requestedOn: true, priorityOrder: 1 },
            }),
            context,
        );
        // 洗衣機是優先，跳過；延後烤箱後 1600 + 3000 + 500 = 5100，再延後熱水器到 2100W
        expect(states(result.appliances)).toMatchObject({
            'Washing Machine': 'on',
            Oven: 'delayed',
            'Water Heater': 'delayed',
        });
        expect(totalPower(result.appliances)).toBe(2100);
    });

    it('被延後的裝置指定優先後立刻恢復，改延後其他裝置', () => {
        const result = evaluate(
            withChanges({
                4: { requestedOn: true, state: 'on' },
                5: { requestedOn: true, state: 'delayed', priorityOrder: 1 },
            }),
            context,
        );
        expect(result.appliances[4]).toMatchObject({ state: 'on', reason: '已指定為優先，維持正常運轉' });
        expect(result.appliances[3].state).toBe('delayed');
        expect(result.decisions.map((decision) => [decision.rule, decision.action])).toEqual([
            ['B4', 'priority-restore'],
            ['B1', 'delay'],
        ]);
    });

    it('外在條件改變造成衝突時，從最近指定的優先開始撤銷', () => {
        const input = withChanges({
            4: { requestedOn: true, priorityOrder: 1 },
            5: { requestedOn: true, priorityOrder: 2 },
        });
        // 上限降到 4200W：1600 + 3000 + 2000 = 6600，冷氣降載後 6100W，
        // 撤銷最近指定的烤箱並延後，降到 4100W；熱水器的優先保留
        const result = evaluate(input, { powerLimit: 4200, allowRevoke: true });
        expect(result.appliances[4]).toMatchObject({ priorityOrder: null, state: 'delayed' });
        expect(result.appliances[3]).toMatchObject({ priorityOrder: 1, state: 'on' });
        expect(totalPower(result.appliances)).toBe(4100);
        expect(result.decisions.map((decision) => [decision.rule, decision.applianceId, decision.action])).toEqual([
            ['B1', 3, 'reduce'],
            ['B4', 5, 'priority-revoke'],
            ['B1', 5, 'delay'],
        ]);
    });

    it('沒有允許撤銷時，優先衝突會變成無法解決的超標', () => {
        const input = withChanges({
            4: { requestedOn: true, priorityOrder: 1 },
            5: { requestedOn: true, priorityOrder: 2 },
        });
        const result = evaluate(input, { powerLimit: 4000 });
        expect(result.appliances[4].priorityOrder).toBe(2);
        expect(result.decisions.at(-1)?.action).toBe('overload-unresolved');
    });
});

describe('evaluate：舒適保護', () => {
    const hot = { powerLimit: 5000, indoorTemperature: 29, comfortThreshold: 28 };

    it('室溫超過門檻時，已降載的冷氣恢復正常', () => {
        const result = evaluate(withChanges({ 3: { state: 'reduced' } }), hot);
        expect(result.appliances[2]).toMatchObject({
            state: 'on',
            reason: '室溫 29°C 超過 28°C，Air Conditioner 維持正常運轉',
        });
        expect(result.decisions[0]).toMatchObject({ rule: 'B3', applianceId: 3, action: 'comfort-restore' });
    });

    it('剛好等於門檻不算超過', () => {
        const result = evaluate(withChanges({}), { powerLimit: 1500, indoorTemperature: 28, comfortThreshold: 28 });
        expect(result.appliances[2].state).toBe('reduced');
    });

    it('冷氣恢復後超標，改延後其他裝置', () => {
        const result = evaluate(
            withChanges({
                3: { state: 'reduced' },
                4: { requestedOn: true, state: 'on' },
                6: { requestedOn: true, state: 'on' },
            }),
            hot,
        );
        // 300 + 800 + 3000 + 500 = 4600，冷氣恢復到 1300 變 5100W，延後洗衣機回到 4600W
        expect(states(result.appliances)).toMatchObject({ 'Air Conditioner': 'on', 'Washing Machine': 'delayed' });
        expect(totalPower(result.appliances)).toBe(4600);
    });

    it('冷氣用上限判斷，不是用恢復門檻', () => {
        const result = evaluate(
            withChanges({ 3: { state: 'reduced' }, 4: { requestedOn: true, state: 'on' }, 6: { requestedOn: true, state: 'on' } }),
            { ...hot, powerLimit: 5200 },
        );
        // 冷氣恢復後 5100W：超過恢復門檻 5000W，但沒超過上限 5200W，所以不用延後其他裝置
        expect(totalPower(result.appliances)).toBe(5100);
        expect(states(result.appliances)).toMatchObject({ 'Air Conditioner': 'on', 'Washing Machine': 'on' });
    });

    it('超標時不降載冷氣，改延後其他裝置', () => {
        const result = evaluate(
            withChanges({ 4: { requestedOn: true }, 5: { requestedOn: true }, 6: { requestedOn: true } }),
            { ...hot, powerLimit: 3500 },
        );
        // 7100W 依序延後洗衣機、烤箱、熱水器到 1600W，冷氣維持 1300W
        expect(states(result.appliances)).toMatchObject({ 'Air Conditioner': 'on', 'Water Heater': 'delayed' });
        expect(totalPower(result.appliances)).toBe(1600);
    });

    it('室溫升高造成優先衝突時，撤銷最近指定的優先', () => {
        const result = evaluate(
            withChanges({
                3: { state: 'reduced' },
                4: { requestedOn: true, state: 'on', priorityOrder: 1 },
                6: { requestedOn: true, state: 'on', priorityOrder: 2 },
            }),
            { ...hot, allowRevoke: true },
        );
        // 冷氣恢復後 5100W，熱水器和洗衣機都是優先；撤銷最近的洗衣機並延後，回到 4600W
        expect(result.appliances[5]).toMatchObject({ priorityOrder: null, state: 'delayed' });
        expect(result.appliances[3]).toMatchObject({ priorityOrder: 1, state: 'on' });
        expect(result.decisions.map((decision) => [decision.rule, decision.action])).toEqual([
            ['B3', 'comfort-restore'],
            ['B4', 'priority-revoke'],
            ['B1', 'delay'],
        ]);
    });
});

