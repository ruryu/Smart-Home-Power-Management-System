import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupSwagger } from '../src/swagger.js';

type Operation = {
  tags?: string[];
  summary?: string;
  requestBody?: unknown;
  responses: Record<string, { content?: Record<string, { schema?: unknown }> }>;
};

describe('Swagger 文件 (e2e)', () => {
  let app: INestApplication<App>;
  let operations: [string, Operation][];
  let schemas: Record<string, unknown>;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.setGlobalPrefix('api');
    setupSwagger(app);
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const paths = res.body.paths as Record<string, Record<string, Operation>>;
    operations = Object.entries(paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, operation]) => [`${method.toUpperCase()} ${path}`, operation] as [string, Operation]),
    );
    schemas = res.body.components.schemas;
  });

  afterAll(async () => {
    await app.close();
  });

  it('網頁可以打開', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(res.text).toContain('swagger');
  });

  it('列出全部 18 支 API', () => {
    expect(operations.map(([name]) => name).sort()).toEqual(
      [
        'GET /api/health',
        'GET /api/status',
        'PUT /api/appliances/{id}/power',
        'PUT /api/appliances/{id}/priority',
        'GET /api/appliances',
        'POST /api/appliances',
        'PATCH /api/appliances/{id}',
        'DELETE /api/appliances/{id}',
        'GET /api/rooms',
        'POST /api/rooms',
        'PATCH /api/rooms/{id}',
        'DELETE /api/rooms/{id}',
        'GET /api/decisions',
        'POST /api/simulation/reset',
        'PUT /api/simulation/temperature',
        'PUT /api/simulation/power-limit',
        'POST /api/simulation/appliances/{id}/usage',
        'POST /api/simulation/appliances/{id}/repair',
      ].sort(),
    );
  });

  it('每支 API 都有分類、說明和成功回應', () => {
    for (const [name, operation] of operations) {
      expect(operation.tags, name).toHaveLength(1);
      expect(operation.summary, name).toBeTruthy();
      const success = Object.keys(operation.responses).filter((status) => status.startsWith('2'));
      expect(success, name).toHaveLength(1);
      if (success[0] !== '204') {
        expect(operation.responses[success[0]].content?.['application/json']?.schema, name).toBeTruthy();
      }
    }
  });

  it('有傳入資料的 API 都有 requestBody', () => {
    const withBody = operations.filter(([, operation]) => operation.requestBody).map(([name]) => name);
    expect(withBody.sort()).toEqual(
      [
        'POST /api/appliances',
        'PATCH /api/appliances/{id}',
        'PUT /api/appliances/{id}/power',
        'PUT /api/appliances/{id}/priority',
        'POST /api/rooms',
        'PATCH /api/rooms/{id}',
        'PUT /api/simulation/temperature',
        'PUT /api/simulation/power-limit',
        'POST /api/simulation/appliances/{id}/usage',
      ].sort(),
    );
  });

  it('產生所有資料格式', () => {
    expect(Object.keys(schemas).sort()).toEqual(
      [
        'ApiErrorDto',
        'ApplianceDto',
        'ApplianceStatusDto',
        'CreateApplianceDto',
        'DecisionDto',
        'HealthDto',
        'PowerLimitRequestDto',
        'PowerRequestDto',
        'PriorityRequestDto',
        'RoomDto',
        'RoomNameDto',
        'StatusDto',
        'TemperatureRequestDto',
        'UpdateApplianceDto',
        'UsageRequestDto',
      ].sort(),
    );
  });
});
