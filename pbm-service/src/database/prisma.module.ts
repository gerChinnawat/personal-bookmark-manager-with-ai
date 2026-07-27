import { Module } from '@nestjs/common';
import { PrismaService } from './prisma-service/prisma.service';
import { CollectionRepository } from './collection/collection.repository';
import { BookmarkRepository } from './bookmark/bookmark.repository';

@Module({
  providers: [PrismaService, CollectionRepository, BookmarkRepository],
  exports: [CollectionRepository, BookmarkRepository],
})
export class DatabaseModule {}
