import { Injectable, NotFoundException } from '@nestjs/common';
import { Bookmark } from '@prisma/client';
import {
  BookmarkRepository,
  FindAllOptions,
} from '../../../database/bookmark/bookmark.repository';
import { CollectionRepository } from '../../../database/collection/collection.repository';
import { CreateBookmarkDto, UpdateBookmarkDto } from '../dtos/bookmark.dto';
import { encodeCursor } from '../../../common/pagination/cursor';

const NOT_FOUND_MESSAGE = 'Bookmark not found';
const COLLECTION_NOT_FOUND_MESSAGE = 'Collection not found';

// ownerId is always the caller's own id and carries no information the
// caller doesn't already have (API_DESIGN.md §3), so it's never serialised.
function omitOwnerId(bookmark: Bookmark): Omit<Bookmark, 'ownerId'> {
  const { ownerId: _ownerId, ...rest } = bookmark;
  return rest;
}

export interface BookmarkListResult {
  items: Omit<Bookmark, 'ownerId'>[];
  nextCursor?: string;
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
    options: FindAllOptions,
  ): Promise<BookmarkListResult> {
    // collectionId as a list filter gets the same ownership check as
    // collectionId on a write (API_DESIGN.md §5: "404 if not the caller's")
    // — otherwise a foreign collection id would just silently return an
    // empty list instead of surfacing that it isn't the caller's.
    if (options.collectionId) {
      await this.assertOwnsCollection(ownerId, options.collectionId);
    }
    const limit = options.limit ?? 25;
    const found = await this.bookmarkRepository.findAll(ownerId, options);
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

  // PUT: full replace. url/title are required on the DTO already; notes and
  // collectionId are optional there, but on a replace "optional field
  // absent" means "clear it", not "leave it alone" (API_DESIGN.md §4) — so
  // both are explicitly nulled when the DTO doesn't carry them, unlike
  // PATCH's `update` above, which only ever touches keys actually present.
  async replace(ownerId: string, id: string, dto: CreateBookmarkDto) {
    if (dto.collectionId) {
      await this.assertOwnsCollection(ownerId, dto.collectionId);
    }
    const updated = await this.bookmarkRepository.update(ownerId, id, {
      url: dto.url,
      title: dto.title,
      notes: dto.notes ?? null,
      collectionId: dto.collectionId ?? null,
    });
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return omitOwnerId(updated);
  }

  async remove(ownerId: string, id: string) {
    const removed = await this.bookmarkRepository.remove(ownerId, id);
    if (!removed) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }
}
