import { Injectable } from '@nestjs/common';
import { BookmarkService } from '../services/bookmark.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from '../dtos/bookmark.dto';
import { BookmarkListQueryDto } from '../../../common/dtos/list-query.dto';
import { FindAllOptions } from '../../../database/bookmark/bookmark.repository';

@Injectable()
export class BookmarkManager {
  constructor(private readonly bookmarkService: BookmarkService) {}

  create(ownerId: string, dto: CreateBookmarkDto) {
    return this.bookmarkService.create(ownerId, dto);
  }

  findAll(ownerId: string, query: BookmarkListQueryDto | FindAllOptions) {
    return this.bookmarkService.findAll(ownerId, query);
  }

  findOne(ownerId: string, id: string) {
    return this.bookmarkService.findOne(ownerId, id);
  }

  update(ownerId: string, id: string, dto: UpdateBookmarkDto) {
    return this.bookmarkService.update(ownerId, id, dto);
  }

  replace(ownerId: string, id: string, dto: CreateBookmarkDto) {
    return this.bookmarkService.replace(ownerId, id, dto);
  }

  remove(ownerId: string, id: string) {
    return this.bookmarkService.remove(ownerId, id);
  }
}
