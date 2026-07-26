import { Injectable, NotFoundException } from '@nestjs/common';
import { Collection } from '@prisma/client';
import { CollectionRepository } from '../../../database/collection/collection.repository';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dtos/collection.dto';

const NOT_FOUND_MESSAGE = 'Collection not found';

// ownerId is always the caller's own id and carries no information the
// caller doesn't already have (API_DESIGN.md §3), so it's never serialised.
function omitOwnerId(collection: Collection): Omit<Collection, 'ownerId'> {
  const { ownerId: _ownerId, ...rest } = collection;
  return rest;
}

@Injectable()
export class CollectionService {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  async create(ownerId: string, dto: CreateCollectionDto) {
    const created = await this.collectionRepository.create(ownerId, dto);
    return omitOwnerId(created);
  }

  async findAll(
    ownerId: string,
    pagination: { limit?: number; offset?: number },
  ) {
    const found = await this.collectionRepository.findAll(ownerId, pagination);
    return found.map(omitOwnerId);
  }

  async findOne(ownerId: string, id: string) {
    const found = await this.collectionRepository.findOne(ownerId, id);
    if (!found) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return omitOwnerId(found);
  }

  async update(ownerId: string, id: string, dto: UpdateCollectionDto) {
    const updated = await this.collectionRepository.update(ownerId, id, dto);
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return omitOwnerId(updated);
  }

  async remove(ownerId: string, id: string) {
    const removed = await this.collectionRepository.remove(ownerId, id);
    if (!removed) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }
}
