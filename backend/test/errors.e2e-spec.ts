import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createApp } from './create-app.js';

describe('錯誤格式 (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('不存在的 API 回傳 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: '找不到這個 API' });
  });

  it('壞掉的 JSON 回傳 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
