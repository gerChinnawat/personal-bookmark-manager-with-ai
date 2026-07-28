import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BookmarkManager } from '../managers/bookmark.manager';
import { CreateBookmarkDto, UpdateBookmarkDto } from '../dtos/bookmark.dto';
import { BookmarkListQueryDto } from '../../../common/dtos/list-query.dto';

@ApiTags('bookmarks')
@ApiBearerAuth('access-token')
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkManager: BookmarkManager) {}

  @Post()
  create(@CurrentUser() ownerId: string, @Body() dto: CreateBookmarkDto) {
    return this.bookmarkManager.create(ownerId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() ownerId: string,
    @Query() query: BookmarkListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { items, nextCursor } = await this.bookmarkManager.findAll(
      ownerId,
      query,
    );
    if (nextCursor) res.set('X-Next-Cursor', nextCursor);
    return items;
  }

  @Get(':id')
  findOne(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.bookmarkManager.findOne(ownerId, id);
  }

  @Put(':id')
  replace(
    @CurrentUser() ownerId: string,
    @Param('id') id: string,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarkManager.replace(ownerId, id, dto);
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
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.bookmarkManager.remove(ownerId, id);
  }
}
