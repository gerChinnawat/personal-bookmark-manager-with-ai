import { Injectable, NotFoundException } from '@nestjs/common';
import { Bookmark } from '@prisma/client';
import { BookmarkRepository } from '../../../database/bookmark/bookmark.repository';
import { CollectionRepository } from '../../../database/collection/collection.repository';
import { CreateBookmarkDto, UpdateBookmarkDto } from '../dtos/bookmark.dto';

const NOT_FOUND_MESSAGE = 'Bookmark not found';
const COLLECTION_NOT_FOUND_MESSAGE = 'Collection not found';

// ownerId is always the caller's own id and carries no information the
// caller doesn't already have (API_DESIGN.md §3), so it's never serialised.
function omitOwnerId(bookmark: Bookmark): Omit<Bookmark, 'ownerId'> {
  const { ownerId: _ownerId, ...rest } = bookmark;
  return rest;
}

@Injectable()
export class BookmarkService {
  constructor(
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly collectionRepository: CollectionRepository,
  ) {}

  // Second ownership check (CLAUDE.md rule 5): a collectionId a bookmark
  // write points at must belong to the caller, independent of the check on
  // the bookmark row itself. Same 404 as "collection doesn't exist" — no
  // existence oracle (API_DESIGN.md §2).
  private async assertOwnsCollection(ownerId: string, collectionId: string) {
    const collection = await this.collectionRepository.findOne(
      ownerId,
      collectionId,
    );
    if (!collection) throw new NotFoundException(COLLECTION_NOT_FOUND_MESSAGE);
  }

  async create(ownerId: string, dto: CreateBookmarkDto) {
    if (dto.collectionId) {
      await this.assertOwnsCollection(ownerId, dto.collectionId);
    }
    const created = await this.bookmarkRepository.create(ownerId, dto);
    return omitOwnerId(created);
  }

  async findAll(
    ownerId: string,
    pagination: { limit?: number; offset?: number },
  ) {
    const found = await this.bookmarkRepository.findAll(ownerId, pagination);
    return found.map(omitOwnerId);
  }

  async findOne(ownerId: string, id: string) {
    const found = await this.bookmarkRepository.findOne(ownerId, id);
    if (!found) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return omitOwnerId(found);
  }

  async update(ownerId: string, id: string, dto: UpdateBookmarkDto) {
    if (dto.collectionId) {
      await this.assertOwnsCollection(ownerId, dto.collectionId);
    }
    const updated = await this.bookmarkRepository.update(ownerId, id, dto);
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return omitOwnerId(updated);
  }

  async remove(ownerId: string, id: string) {
    const removed = await this.bookmarkRepository.remove(ownerId, id);
    if (!removed) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }
}
