import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

type ApplianceStatus = { id: number; name: string; state: string; reason: string | null; currentPower: number };

describe('開關裝置 (e2e)', () => {
  let app: INestApplication<App>;

  const setPower = (id: number | string, on: unknown) =>
    request(app.getHttpServer()).put(`/api/appliances/${id}/power`).send({ on });

  const stateOf = (body: { appliances: ApplianceStatus[] }, id: number) =>
    body.appliances.find((appliance) => appliance.id === id)!;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('開啟後沒有超標，直接開啟並回傳完整狀態', async () => {
    const res = await setPower(5, true).expect(200);
    expect(res.body.totalPower).toBe(3600);
    expect(stateOf(res.body, 5)).toMatchObject({ state: 'on', requestedOn: true, currentPower: 2000, reason: null });
    expect(res.body.warnings).toEqual([]);
  });

  it('超過 5000W 時依序延後洗衣機和烤箱，降到 4600W', async () => {
    await setPower(4, true).expect(200);
    await setPower(5, true).expect(200);
    const res = await setPower(6, true).expect(200);

    // 開熱水器 4600W → 開烤箱 6600W 延後烤箱 → 開洗衣機 5100W 延後洗衣機
    expect(res.body.totalPower).toBe(4600);
    expect(stateOf(res.body, 5)).toMatchObject({ state: 'delayed', requestedOn: true, reason: '總用電超過上限 5000W，已延後' });
    expect(stateOf(res.body, 6).state).toBe('delayed');
    expect(res.body.warnings).toEqual(['為了不超過上限 5000W，系統已調整：Oven（延後）、Washing Machine（延後）']);
    expect(res.body.unresolvedOverload).toBeNull();
  });

  it('關閉裝置後自動恢復被延後的裝置', async () => {
    await setPower(4, true);
    await setPower(5, true);
    await setPower(6, true);
    const res = await setPower(4, false).expect(200);

    // 1600W 時先恢復烤箱到 3600W，再恢復洗衣機到 4100W
    expect(res.body.totalPower).toBe(4100);
    expect(stateOf(res.body, 5)).toMatchObject({ state: 'on', reason: '用電已下降，已自動恢復' });
    expect(stateOf(res.body, 6).state).toBe('on');
    expect(stateOf(res.body, 4)).toMatchObject({ state: 'off', reason: null });
  });

  it('關閉被延後的裝置，它就不會再被恢復', async () => {
    await setPower(4, true);
    await setPower(5, true);
    await setPower(5, false);
    const res = await setPower(4, false).expect(200);
    expect(stateOf(res.body, 5)).toMatchObject({ state: 'off', requestedOn: false });
  });

  it('重複傳相同的值不算錯誤', async () => {
    await setPower(5, true).expect(200);
    const res = await setPower(5, true).expect(200);
    expect(res.body.totalPower).toBe(3600);
  });

  it('on 不是 boolean 回傳 400', async () => {
    const res = await setPower(5, 'yes').expect(400);
    expect(res.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: '傳入的資料格式不正確',
      details: ['on 必須是 true 或 false'],
    });
  });

  it('裝置不存在回傳 404', async () => {
    const res = await setPower(99, true).expect(404);
    expect(res.body.code).toBe('APPLIANCE_NOT_FOUND');
  });

  it('無法解決的超標時，拒絕開啟其他裝置', async () => {
    // 新增 4000W 不能調整的裝置並開啟：1600 + 4000 = 5600，冷氣降載後還是 5100W
    const kettle = await request(app.getHttpServer())
      .post('/api/appliances')
      .send({ roomId: 5, name: 'Kettle', ratedPower: 4000, adjustment: 'none' })
      .expect(201);
    const overloaded = await setPower(kettle.body.id, true).expect(200);
    expect(overloaded.body.unresolvedOverload).toBe(100);
    expect(stateOf(overloaded.body, 3)).toMatchObject({ state: 'reduced', currentPower: 800 });
    expect(overloaded.body.warnings[0]).toBe(
      '總用電超過上限 5000W 共 100W，已無法再調整，暫停接受增加用電的操作',
    );

    const res = await setPower(5, true).expect(409);
    expect(res.body).toEqual({
      code: 'UNRESOLVED_OVERLOAD',
      message: '目前用電已超過上限且無法再調整，暫時不能開啟裝置',
      details: { overload: 100 },
    });

    // 關閉造成超標的裝置後恢復正常
    const recovered = await setPower(kettle.body.id, false).expect(200);
    expect(recovered.body.unresolvedOverload).toBeNull();
    expect(stateOf(recovered.body, 3).state).toBe('on');
  });
});
