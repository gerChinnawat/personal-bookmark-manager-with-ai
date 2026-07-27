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
import { CollectionManager } from '../managers/collection.manager';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dtos/collection.dto';

@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionManager: CollectionManager) {}

  @Post()
  create(@CurrentUser() ownerId: string, @Body() dto: CreateCollectionDto) {
    return this.collectionManager.create(ownerId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() ownerId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.collectionManager.findAll(ownerId, { limit, offset });
  }

  @Get(':id')
  findOne(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.collectionManager.findOne(ownerId, id);
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
  remove(@CurrentUser() ownerId: string, @Param('id') id: string) {
    return this.collectionManager.remove(ownerId, id);
  }
}
