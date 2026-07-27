import { Injectable } from '@nestjs/common';
import { BookmarkService } from '../services/bookmark.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from '../dtos/bookmark.dto';

@Injectable()
export class BookmarkManager {
  constructor(private readonly bookmarkService: BookmarkService) {}

  create(ownerId: string, dto: CreateBookmarkDto) {
    return this.bookmarkService.create(ownerId, dto);
  }

  findAll(ownerId: string, pagination: { limit?: number; offset?: number }) {
    return this.bookmarkService.findAll(ownerId, pagination);
  }

  findOne(ownerId: string, id: string) {
    return this.bookmarkService.findOne(ownerId, id);
  }

  update(ownerId: string, id: string, dto: UpdateBookmarkDto) {
    return this.bookmarkService.update(ownerId, id, dto);
  }

  remove(ownerId: string, id: string) {
    return this.bookmarkService.remove(ownerId, id);
  }
}
