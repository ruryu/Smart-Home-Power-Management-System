import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

describe('決策紀錄 (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => app.getHttpServer();
  const setPower = (id: number, on: boolean) => request(server()).put(`/api/appliances/${id}/power`).send({ on });

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('一開始沒有紀錄', async () => {
    const res = await request(server()).get('/api/decisions').expect(200);
    expect(res.body).toEqual([]);
  });

  it('記錄超標調整和自動恢復，最新的在前面', async () => {
    await setPower(4, true);
    await setPower(5, true); // 延後烤箱
    await setPower(4, false); // 恢復烤箱

    const res = await request(server()).get('/api/decisions').expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      rule: 'B2',
      ruleName: '自動恢復',
      applianceId: 5,
      applianceName: 'Oven',
      action: 'restore',
      reason: '恢復後總用電 3600W 未超過 4800W，恢復 Oven',
    });
    expect(res.body[1]).toMatchObject({
      rule: 'B1',
      ruleName: '超標調整',
      action: 'delay',
      reason: '總用電 6600W 超過上限 5000W，延後 Oven',
    });
    expect(new Date(res.body[0].createdAt).toString()).not.toBe('Invalid Date');
  });

  it('被拒絕的要求也會記錄', async () => {
    await setPower(4, true);
    await request(server()).put('/api/appliances/4/priority').send({ enabled: true });
    await request(server()).put('/api/appliances/5/priority').send({ enabled: true }).expect(409);

    const res = await request(server()).get('/api/decisions?limit=1').expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        rule: 'B4',
        action: 'priority-reject',
        reason: '指定 Oven 為優先需要 6100W，超過上限 5000W，不足 1100W',
      }),
    ]);
  });

  it('裝置刪除後，紀錄還在但沒有裝置名稱', async () => {
    await setPower(4, true);
    await setPower(5, true);
    await request(server()).delete('/api/appliances/5').expect(204);
    const res = await request(server()).get('/api/decisions').expect(200);
    expect(res.body[0]).toMatchObject({ action: 'delay', applianceId: null, applianceName: null });
  });

  it('重置後清空紀錄', async () => {
    await setPower(4, true);
    await setPower(5, true);
    await request(server()).post('/api/simulation/reset').expect(200);
    const res = await request(server()).get('/api/decisions').expect(200);
    expect(res.body).toEqual([]);
  });

  it('limit 不正確回傳 400', async () => {
    const res = await request(server()).get('/api/decisions?limit=0').expect(400);
    expect(res.body.details).toEqual(['limit 必須是 1 到 200 的整數']);
  });
});
