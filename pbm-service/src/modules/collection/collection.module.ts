import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/prisma.module';
import { CollectionController } from './controllers/collection.controller';
import { CollectionService } from './services/collection.service';
import { CollectionManager } from './managers/collection.manager';

@Module({
  imports: [DatabaseModule],
  controllers: [CollectionController],
  providers: [CollectionService, CollectionManager],
})
export class CollectionModule {}
