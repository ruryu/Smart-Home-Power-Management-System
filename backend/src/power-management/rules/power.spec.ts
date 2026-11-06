import type { Appliance } from '../../appliances/appliances.js';
import { currentPower, totalPower } from './power.js';

function appliance(overrides: Partial<Appliance>): Appliance {
    return {
        id: 1,
        roomId: 1,
        name: 'Test',
        ratedPower: 1300,
        reducedPower: 800,
        adjustment: 'reduce',
        adjustmentOrder: 1,
        requestedOn: true,
        state: 'on',
        priorityOrder: null,
        ...overrides,
    };
}

describe('currentPower', () => {
  it('uses rated power when on', () => {
    expect(currentPower(appliance({ state: 'on' }))).toBe(1300);
  });

  it('uses reduced power when reduced', () => {
    expect(currentPower(appliance({ state: 'reduced' }))).toBe(800);
  });

  it.each(['off', 'delayed', 'faulted'] as const)('uses 0 W when %s', (state) => {
    expect(currentPower(appliance({ state }))).toBe(0);
  });
});

describe('totalPower', () => {
  it('adds current power of all appliances', () => {
    expect(
      totalPower([
        appliance({ state: 'on' }),
        appliance({ state: 'reduced' }),
        appliance({ state: 'delayed' }),
      ]),
    ).toBe(2100);
  });
});