import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/prisma.module';
import { CollectionModule } from './collection/collection.module';

@Module({
  imports: [DatabaseModule, CollectionModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
