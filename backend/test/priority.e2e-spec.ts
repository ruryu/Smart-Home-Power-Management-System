import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

type ApplianceStatus = { id: number; state: string; priorityOrder: number | null; reason: string | null };

describe('使用者優先 (e2e)', () => {
  let app: INestApplication<App>;

  const setPower = (id: number, on: boolean) =>
    request(app.getHttpServer()).put(`/api/appliances/${id}/power`).send({ on });
  const setPriority = (id: number | string, enabled: unknown) =>
    request(app.getHttpServer()).put(`/api/appliances/${id}/priority`).send({ enabled });
  const stateOf = (body: { appliances: ApplianceStatus[] }, id: number) =>
    body.appliances.find((appliance) => appliance.id === id)!;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('指定優先後，被延後的裝置恢復，改延後其他裝置', async () => {
    await setPower(4, true);
    const delayed = await setPower(5, true);
    expect(stateOf(delayed.body, 5).state).toBe('delayed');

    const res = await setPriority(5, true).expect(200);
    expect(stateOf(res.body, 5)).toMatchObject({ state: 'on', priorityOrder: 1, reason: '已指定為優先，維持正常運轉' });
    expect(stateOf(res.body, 4).state).toBe('delayed');
    expect(res.body.totalPower).toBe(3600);
  });

  it('Proposal 範例：熱水器已是優先時再指定烤箱，不足 1100W', async () => {
    await setPower(4, true);
    await setPriority(4, true).expect(200);

    const res = await setPriority(5, true).expect(409);
    expect(res.body).toEqual({
      code: 'INSUFFICIENT_POWER',
      message: '指定為優先後一定會超過上限，不足 1100W',
      details: { shortfall: 1100 },
    });
  });

  it('優先的順序依指定先後遞增', async () => {
    await setPriority(6, true).expect(200);
    const res = await setPriority(4, true).expect(200);
    expect(stateOf(res.body, 6).priorityOrder).toBe(1);
    expect(stateOf(res.body, 4).priorityOrder).toBe(2);
  });

  it('取消優先後，超標時會被調整', async () => {
    await setPower(4, true);
    await setPower(5, true);
    await setPriority(5, true);
    const res = await setPriority(5, false).expect(200);
    // 取消後總用電還在上限內，所以烤箱維持開啟
    expect(stateOf(res.body, 5)).toMatchObject({ state: 'on', priorityOrder: null });
    expect(stateOf(res.body, 4).state).toBe('delayed');
  });

  it('重複傳相同的值不算錯誤', async () => {
    await setPriority(6, true).expect(200);
    const res = await setPriority(6, true).expect(200);
    expect(stateOf(res.body, 6).priorityOrder).toBe(1);
    await setPriority(5, false).expect(200);
  });

  it('enabled 不是 boolean 回傳 400', async () => {
    const res = await setPriority(5, 1).expect(400);
    expect(res.body.details).toEqual(['enabled 必須是 true 或 false']);
  });

  it('裝置不存在回傳 404', async () => {
    const res = await setPriority(99, true).expect(404);
    expect(res.body.code).toBe('APPLIANCE_NOT_FOUND');
  });
});
