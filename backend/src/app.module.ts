import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller.js';
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
})
export class AppModule {}
