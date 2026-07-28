import { Injectable, NotFoundException } from '@nestjs/common';
import { Collection } from '@prisma/client';
import {
  CollectionRepository,
  FindAllOptions,
} from '../../../database/collection/collection.repository';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dtos/collection.dto';
import { encodeCursor } from '../../../common/pagination/cursor';

const NOT_FOUND_MESSAGE = 'Collection not found';

// ownerId is always the caller's own id and carries no information the
// caller doesn't already have (API_DESIGN.md §3), so it's never serialised.
function omitOwnerId(collection: Collection): Omit<Collection, 'ownerId'> {
  const { ownerId: _ownerId, ...rest } = collection;
  return rest;
}

export interface CollectionListResult {
  items: Omit<Collection, 'ownerId'>[];
  nextCursor?: string;
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
    options: FindAllOptions,
  ): Promise<CollectionListResult> {
    const limit = options.limit ?? 25;
    const found = await this.collectionRepository.findAll(ownerId, options);
    // A full page may mean more rows exist; the cursor for the next page is
    // the keyset position of the last row returned (API_DESIGN.md §5).
    const nextCursor =
      found.length === limit
        ? encodeCursor({
            createdAt: found[found.length - 1].createdAt.toISOString(),
            id: found[found.length - 1].id,
          })
        : undefined;
    return { items: found.map(omitOwnerId), nextCursor };
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

  // PUT: full replace. Collection has one mutable field (name), which is
  // required on the DTO, so there is no optional field to null out here —
  // unlike Bookmark, whose PUT does have that case (see bookmark.service.ts).
  async replace(ownerId: string, id: string, dto: CreateCollectionDto) {
    const updated = await this.collectionRepository.update(ownerId, id, {
      name: dto.name,
    });
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return omitOwnerId(updated);
  }

  async remove(ownerId: string, id: string) {
    const removed = await this.collectionRepository.remove(ownerId, id);
    if (!removed) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }

  async enableShare(ownerId: string, id: string) {
    const updated = await this.collectionRepository.setShareEnabled(
      ownerId,
      id,
      true,
    );
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return { shareToken: updated.shareToken };
  }

  async disableShare(ownerId: string, id: string) {
    const updated = await this.collectionRepository.setShareEnabled(
      ownerId,
      id,
      false,
    );
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }

  // Public route (no ownerId): resolves a share link to the collection it
  // points at. findByShareToken already filters on shareEnabled, so a
  // disabled link 404s identically to an unknown one (API_DESIGN.md §2/§4).
  async resolveShare(token: string) {
    const found = await this.collectionRepository.findByShareToken(token);
    if (!found) throw new NotFoundException(NOT_FOUND_MESSAGE);
    const { ownerId: _ownerId, shareToken: _shareToken, ...rest } = found;
    return rest;
  }
}
