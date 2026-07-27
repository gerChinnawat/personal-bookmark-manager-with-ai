import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/prisma.module';
import { BookmarkController } from './controllers/bookmark.controller';
import { BookmarkService } from './services/bookmark.service';
import { BookmarkManager } from './managers/bookmark.manager';

@Module({
  imports: [DatabaseModule],
  controllers: [BookmarkController],
  providers: [BookmarkService, BookmarkManager],
})
export class BookmarkModule {}
