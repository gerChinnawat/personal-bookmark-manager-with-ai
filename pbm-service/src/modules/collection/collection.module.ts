import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/prisma.module';
import { BookmarkModule } from '../bookmark/bookmark.module';
import { CollectionController } from './controllers/collection.controller';
import { ShareController } from './controllers/share.controller';
import { CollectionService } from './services/collection.service';
import { CollectionManager } from './managers/collection.manager';

@Module({
  imports: [DatabaseModule, BookmarkModule],
  controllers: [CollectionController, ShareController],
  providers: [CollectionService, CollectionManager],
  exports: [CollectionManager],
})
export class CollectionModule {}
