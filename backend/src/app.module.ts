import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { DatabaseModule } from './database/database.module.js';
import { StatusModule } from './status/status.module.js';

@Module({
  imports: [
    DatabaseModule,
    StatusModule,
    ServeStaticModule.forRoot({
      rootPath: join(import.meta.dirname, '..', '..', 'frontend'),
      exclude: ['/api/{*path}'],
    }),
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
