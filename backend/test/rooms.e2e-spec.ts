import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

describe('房間管理 (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/rooms 回傳 6 個初始房間', async () => {
    const res = await request(app.getHttpServer()).get('/api/rooms').expect(200);
    expect(res.body).toHaveLength(6);
    expect(res.body[0]).toEqual({ id: 1, name: 'Living Room A' });
  });

  describe('POST /api/rooms', () => {
    it('新增房間', async () => {
      const res = await request(app.getHttpServer()).post('/api/rooms').send({ name: ' Study ' }).expect(201);
      expect(res.body).toEqual({ id: 7, name: 'Study' });
    });

    it('名稱是空的回傳 400', async () => {
      const res = await request(app.getHttpServer()).post('/api/rooms').send({ name: '  ' }).expect(400);
      expect(res.body).toEqual({ code: 'VALIDATION_ERROR', message: '房間設定不正確', details: ['name 不可為空'] });
    });

    it('名稱重複回傳 409', async () => {
      const res = await request(app.getHttpServer()).post('/api/rooms').send({ name: 'Kitchen' }).expect(409);
      expect(res.body.code).toBe('ROOM_NAME_TAKEN');
    });
  });

  describe('PATCH /api/rooms/:id', () => {
    it('修改名稱', async () => {
      const res = await request(app.getHttpServer()).patch('/api/rooms/3').send({ name: 'Office' }).expect(200);
      expect(res.body).toEqual({ id: 3, name: 'Office' });
    });

    it('改成自己原本的名稱不算重複', async () => {
      await request(app.getHttpServer()).patch('/api/rooms/5').send({ name: 'Kitchen' }).expect(200);
    });

    it('改成其他房間的名稱回傳 409', async () => {
      const res = await request(app.getHttpServer()).patch('/api/rooms/3').send({ name: 'Kitchen' }).expect(409);
      expect(res.body.code).toBe('ROOM_NAME_TAKEN');
    });

    it('房間不存在回傳 404', async () => {
      const res = await request(app.getHttpServer()).patch('/api/rooms/99').send({ name: 'X' }).expect(404);
      expect(res.body.code).toBe('ROOM_NOT_FOUND');
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    it('刪除沒有裝置的房間', async () => {
      await request(app.getHttpServer()).delete('/api/rooms/3').expect(204);
      const res = await request(app.getHttpServer()).get('/api/rooms').expect(200);
      expect(res.body.map((room: { id: number }) => room.id)).toEqual([1, 2, 4, 5, 6]);
    });

    it('房間裡還有裝置回傳 409', async () => {
      const res = await request(app.getHttpServer()).delete('/api/rooms/5').expect(409);
      expect(res.body).toEqual({
        code: 'ROOM_NOT_EMPTY',
        message: '房間裡還有裝置，要先移走或刪除裝置',
        details: { roomId: 5, applianceCount: 2 },
      });
    });

    it('房間不存在回傳 404', async () => {
      await request(app.getHttpServer()).delete('/api/rooms/99').expect(404);
    });
  });
});
