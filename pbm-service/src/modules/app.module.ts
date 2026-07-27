import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CollectionModule } from './collection/collection.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AuthModule, DatabaseModule, CollectionModule, BookmarkModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
