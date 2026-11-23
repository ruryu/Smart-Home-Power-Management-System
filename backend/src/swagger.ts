import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Smart Home Power Management API')
    .setDescription(
      [
        '智慧家庭用電管理系統的後端 API。完整說明請看 `docs/api.md`。',
        '',
        '- 用電單位是 W，溫度單位是 °C。',
        '- 所有錯誤都回傳 `{ code, message, details }`。',
        '- 測試前可以先呼叫 `POST /api/simulation/reset` 回到初始狀態。',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addTag('系統', '確認後端運作、查看完整狀態')
    .addTag('控制裝置', '開關裝置、指定優先；會觸發超標調整、自動恢復、使用者優先')
    .addTag('管理裝置', '裝置的查詢、新增、修改、刪除')
    .addTag('管理房間', '房間的查詢、新增、修改、刪除')
    .addTag('決策紀錄', '系統做過的決定與原因')
    .addTag('測試介面', '給助教重現每條規則：重置、室溫、用電上限、故障')
    .build();
  // 分類都自己用 @ApiTags 指定，不要自動用 controller 名稱多加一個分類
  return SwaggerModule.createDocument(app, config, { autoTagControllers: false });
}

// 網頁在 /api/docs，OpenAPI JSON 在 /api/docs-json
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup(SWAGGER_PATH, app, () => createOpenApiDocument(app), {
    useGlobalPrefix: true,
    customSiteTitle: 'SHPMS API',
  });
}
