import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

type ApplianceStatus = { id: number; state: string; priorityOrder: number | null; reason: string | null };

describe('測試介面 (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => app.getHttpServer();
  const setPower = (id: number, on: boolean) => request(server()).put(`/api/appliances/${id}/power`).send({ on });
  const setPriority = (id: number, enabled: boolean) =>
    request(server()).put(`/api/appliances/${id}/priority`).send({ enabled });
  const setTemperature = (indoorTemperature: unknown) =>
    request(server()).put('/api/simulation/temperature').send({ indoorTemperature });
  const setPowerLimit = (powerLimit: unknown) =>
    request(server()).put('/api/simulation/power-limit').send({ powerLimit });
  const stateOf = (body: { appliances: ApplianceStatus[] }, id: number) =>
    body.appliances.find((appliance) => appliance.id === id)!;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/simulation/reset', () => {
    it('重置成初始狀態', async () => {
      await setPower(5, true);
      await setPowerLimit(3000);
      await request(server()).post('/api/rooms').send({ name: 'Study' });

      const res = await request(server()).post('/api/simulation/reset').expect(200);
      expect(res.body).toMatchObject({ totalPower: 1600, powerLimit: 5000, indoorTemperature: 26, unresolvedOverload: null });
      expect(res.body.rooms).toHaveLength(6);
      expect(stateOf(res.body, 5)).toMatchObject({ state: 'off', requestedOn: false });
    });
  });

  describe('PUT /api/simulation/power-limit', () => {
    it('調低上限後重新調整，全部調整完仍超標時回報無法解決的超標', async () => {
      const res = await setPowerLimit(1000).expect(200);
      expect(res.body).toMatchObject({ powerLimit: 1000, restoreThreshold: 800, totalPower: 1100, unresolvedOverload: 100 });
      expect(stateOf(res.body, 3).state).toBe('reduced');
    });

    it('上限調回來後自動恢復', async () => {
      await setPowerLimit(1500);
      const res = await setPowerLimit(5000).expect(200);
      expect(stateOf(res.body, 3)).toMatchObject({ state: 'on', reason: '用電已下降，已自動恢復' });
    });

    it('上限不是正整數回傳 400', async () => {
      const res = await setPowerLimit(0).expect(400);
      expect(res.body.details).toEqual(['powerLimit 須為正整數']);
    });
  });

  describe('PUT /api/simulation/temperature', () => {
    it('室溫超過門檻時，降載的冷氣恢復正常', async () => {
      await setPowerLimit(1500); // 冷氣降載到 800W
      const res = await setTemperature(29).expect(200);
      expect(res.body.comfortActive).toBe(true);
      expect(stateOf(res.body, 3)).toMatchObject({ state: 'on', reason: '室溫 29°C 超過 28°C，Air Conditioner 維持正常運轉' });
      expect(res.body.warnings).toContain('室溫 29°C 超過舒適門檻 28°C，冷氣不會被降載');
    });

    it('室溫升高造成優先衝突時，撤銷最近指定的優先', async () => {
      await setPower(4, true);
      await setPriority(4, true).expect(200);
      await setPower(6, true);
      const accepted = await setPriority(6, true).expect(200);
      // 熱水器和洗衣機都是優先，冷氣降載到 800W，總用電 4600W
      expect(stateOf(accepted.body, 3).state).toBe('reduced');

      const res = await setTemperature(29).expect(200);
      // 冷氣恢復到 1300W 變 5100W，撤銷最近指定的洗衣機並延後
      expect(stateOf(res.body, 6)).toMatchObject({ state: 'delayed', priorityOrder: null });
      expect(stateOf(res.body, 4)).toMatchObject({ state: 'on', priorityOrder: 1 });
      expect(stateOf(res.body, 3).state).toBe('on');
      expect(res.body.totalPower).toBe(4600);
    });

    it('室溫不是數字回傳 400', async () => {
      const res = await setTemperature('hot').expect(400);
      expect(res.body.details).toEqual(['indoorTemperature 必須是數字']);
    });
  });
});
