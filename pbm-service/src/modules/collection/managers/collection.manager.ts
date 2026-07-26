import { Injectable } from '@nestjs/common';
import { CollectionService } from '../services/collection.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dtos/collection.dto';

@Injectable()
export class CollectionManager {
  constructor(private readonly collectionService: CollectionService) {}

  create(ownerId: string, dto: CreateCollectionDto) {
    return this.collectionService.create(ownerId, dto);
  }

  findAll(ownerId: string, pagination: { limit?: number; offset?: number }) {
    return this.collectionService.findAll(ownerId, pagination);
  }

  findOne(ownerId: string, id: string) {
    return this.collectionService.findOne(ownerId, id);
  }

  update(ownerId: string, id: string, dto: UpdateCollectionDto) {
    return this.collectionService.update(ownerId, id, dto);
  }

  remove(ownerId: string, id: string) {
    return this.collectionService.remove(ownerId, id);
  }
}
