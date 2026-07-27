import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BookmarkManager } from '../managers/bookmark.manager';
import { CreateBookmarkDto, UpdateBookmarkDto } from '../dtos/bookmark.dto';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkManager: BookmarkManager) {}

  @Post()
  create(@CurrentUser() ownerId: string, @Body() dto: CreateBookmarkDto) {
    return this.bookmarkManager.create(ownerId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() ownerId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.bookmarkManager.findAll(ownerId, { limit, offset });
  }

  @Get(':id')
  findOne(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.bookmarkManager.findOne(ownerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookmarkDto,
  ) {
    return this.bookmarkManager.update(ownerId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.bookmarkManager.remove(ownerId, id);
  }
}
