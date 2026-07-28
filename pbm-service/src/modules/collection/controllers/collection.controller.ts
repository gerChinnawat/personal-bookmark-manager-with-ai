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
import { CollectionManager } from '../managers/collection.manager';
import { BookmarkManager } from '../../bookmark/managers/bookmark.manager';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dtos/collection.dto';
import {
  CollectionBookmarksQueryDto,
  ListQueryDto,
} from '../../../common/dtos/list-query.dto';

@ApiTags('collections')
@ApiBearerAuth('access-token')
@Controller('collections')
export class CollectionController {
  constructor(
    private readonly collectionManager: CollectionManager,
    private readonly bookmarkManager: BookmarkManager,
  ) {}

  @Post()
  create(@CurrentUser() ownerId: string, @Body() dto: CreateCollectionDto) {
    return this.collectionManager.create(ownerId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() ownerId: string,
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { items, nextCursor } = await this.collectionManager.findAll(
      ownerId,
      query,
    );
    if (nextCursor) res.set('X-Next-Cursor', nextCursor);
    return items;
  }

  @Get(':id')
  findOne(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.collectionManager.findOne(ownerId, id);
  }

  @Put(':id')
  replace(
    @CurrentUser() ownerId: string,
    @Param('id') id: string,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionManager.replace(ownerId, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionManager.update(ownerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.collectionManager.remove(ownerId, id);
  }

  @Get(':id/bookmarks')
  async findBookmarks(
    @CurrentUser() ownerId: string,
    @Param('id') id: string,
    @Query() query: CollectionBookmarksQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 404 if the collection is not the caller's — not an empty list
    // (API_DESIGN.md §4). findOne throws before the bookmark query runs.
    await this.collectionManager.findOne(ownerId, id);
    const { items, nextCursor } = await this.bookmarkManager.findAll(ownerId, {
      ...query,
      collectionId: id,
    });
    if (nextCursor) res.set('X-Next-Cursor', nextCursor);
    return items;
  }
}
