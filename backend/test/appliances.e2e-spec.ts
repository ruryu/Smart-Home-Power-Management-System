import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

describe('裝置管理 (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/appliances', () => {
    it('新增延後型裝置，排在調整順序最後', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 3, name: ' Fan ', ratedPower: 60, adjustment: 'delay' })
        .expect(201);
      expect(res.body).toEqual({
        id: 7,
        roomId: 3,
        name: 'Fan',
        ratedPower: 60,
        reducedPower: null,
        adjustment: 'delay',
        adjustmentOrder: 5,
        requestedOn: false,
        state: 'off',
        priorityOrder: null,
      });
    });

    it('新增不調整的裝置，adjustmentOrder 是 null', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 1, name: 'TV', ratedPower: 150, adjustment: 'none' })
        .expect(201);
      expect(res.body.adjustmentOrder).toBeNull();
    });

    it('新增降載型裝置要帶 reducedPower', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 3, name: 'Heater', ratedPower: 1000, adjustment: 'reduce', reducedPower: 400 })
        .expect(201);
      expect(res.body).toMatchObject({ reducedPower: 400, adjustmentOrder: 5 });
    });

    it('欄位錯誤回傳 400 和所有錯誤原因', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 3, name: '', ratedPower: -1, adjustment: 'delay' })
        .expect(400);
      expect(res.body).toEqual({
        code: 'VALIDATION_ERROR',
        message: '裝置設定不正確',
        details: ['name 不可為空', 'ratedPower 須為正整數'],
      });
    });

    it('reduce 但 reducedPower 不小於 ratedPower 回傳 400', async () => {
      await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 3, name: 'Heater', ratedPower: 1000, adjustment: 'reduce', reducedPower: 1000 })
        .expect(400);
    });

    it('delay 卻帶 reducedPower 回傳 400', async () => {
      await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 3, name: 'Fan', ratedPower: 60, adjustment: 'delay', reducedPower: 30 })
        .expect(400);
    });

    it('房間不存在回傳 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appliances')
        .send({ roomId: 99, name: 'Fan', ratedPower: 60, adjustment: 'delay' })
        .expect(404);
      expect(res.body).toEqual({ code: 'ROOM_NOT_FOUND', message: '找不到這個房間', details: { roomId: 99 } });
    });
  });
});
