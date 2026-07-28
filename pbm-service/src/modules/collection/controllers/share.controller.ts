import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { CollectionManager } from '../managers/collection.manager';
import { BookmarkManager } from '../../bookmark/managers/bookmark.manager';
import { ListQueryDto } from '../../../common/dtos/list-query.dto';

// The second @Public() exception in the app, alongside GET /health
// (API_DESIGN.md §1) — every route here is reachable without a token,
// gated only by knowing a valid, currently-enabled share token.
@ApiTags('share')
@Controller('share/collections')
export class ShareController {
  constructor(
    private readonly collectionManager: CollectionManager,
    private readonly bookmarkManager: BookmarkManager,
  ) {}

  @Public()
  @Get(':token')
  resolve(@Param('token') token: string) {
    return this.collectionManager.resolveShare(token);
  }

  @Public()
  @Get(':token/bookmarks')
  async findBookmarks(
    @Param('token') token: string,
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 404 if the token is unknown/disabled — not an empty list — before the
    // bookmark query runs (same pattern as the owner-only nested route).
    const collection = await this.collectionManager.resolveShare(token);
    const { items, nextCursor } =
      await this.bookmarkManager.findAllForSharedCollection(collection.id, {
        ...query,
      });
    if (nextCursor) res.set('X-Next-Cursor', nextCursor);
    return items;
  }
}
