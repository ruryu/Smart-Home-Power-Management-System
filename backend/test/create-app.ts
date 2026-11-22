import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

// 每個測試都用全新的記憶體資料庫，資料會是初始狀態
export async function createApp(): Promise<INestApplication<App>> {
  process.env.DATABASE_PATH = ':memory:';
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}
