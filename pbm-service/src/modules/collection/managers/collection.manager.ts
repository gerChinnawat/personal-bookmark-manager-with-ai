import { Injectable } from '@nestjs/common';
import { CollectionService } from '../services/collection.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dtos/collection.dto';
import { ListQueryDto } from '../../../common/dtos/list-query.dto';

@Injectable()
export class CollectionManager {
  constructor(private readonly collectionService: CollectionService) {}

  create(ownerId: string, dto: CreateCollectionDto) {
    return this.collectionService.create(ownerId, dto);
  }

  findAll(ownerId: string, query: ListQueryDto) {
    return this.collectionService.findAll(ownerId, query);
  }

  findOne(ownerId: string, id: string) {
    return this.collectionService.findOne(ownerId, id);
  }

  update(ownerId: string, id: string, dto: UpdateCollectionDto) {
    return this.collectionService.update(ownerId, id, dto);
  }

  replace(ownerId: string, id: string, dto: CreateCollectionDto) {
    return this.collectionService.replace(ownerId, id, dto);
  }

  remove(ownerId: string, id: string) {
    return this.collectionService.remove(ownerId, id);
  }
}
