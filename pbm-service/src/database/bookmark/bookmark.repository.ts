import { Injectable } from '@nestjs/common';
import { Bookmark, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma-service/prisma.service';
import { decodeCursor } from '../../common/pagination/cursor';
import {
  DEFAULT_LIMIT,
  DEFAULT_SORT,
  SortValue,
} from '../../common/dtos/list-query.dto';

export interface FindAllOptions {
  limit?: number;
  cursor?: string;
  sort?: SortValue;
  q?: string;
  collectionId?: string;
  uncategorised?: boolean;
}

@Injectable()
export class BookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    ownerId: string,
    data: Omit<Prisma.BookmarkCreateInput, 'ownerId'>,
  ): Promise<Bookmark> {
    return this.prisma.bookmark.create({ data: { ...data, ownerId } });
  }

  findAll(
    ownerId: string,
    {
      limit = DEFAULT_LIMIT,
      cursor,
      sort = DEFAULT_SORT,
      q,
      collectionId,
      uncategorised,
    }: FindAllOptions = {},
  ): Promise<Bookmark[]> {
    const direction = sort === 'createdAt:asc' ? 'asc' : 'desc';
    const where: Prisma.BookmarkWhereInput = { ownerId };

    // uncategorised=true and collectionId are mutually exclusive filters on
    // the same field; the DTO only ever sets one at a time in practice, but
    // uncategorised wins if both somehow arrive.
    if (uncategorised) {
      where.collectionId = null;
    } else if (collectionId) {
      where.collectionId = collectionId;
    }

    // Both q-search and the cursor keyset are naturally OR-of-conditions
    // clauses, and Prisma's `where` object only has one `OR` key — so each
    // one that's present is added as its own entry under `AND` instead of
    // fighting over the same key.
    const andClauses: Prisma.BookmarkWhereInput[] = [];

    if (q) {
      andClauses.push({
        OR: [
          { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { notes: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }

    if (cursor) {
      const position = decodeCursor(cursor);
      const cursorCreatedAt = new Date(position.createdAt);
      const op = direction === 'desc' ? 'lt' : 'gt';
      andClauses.push({
        OR: [
          { createdAt: { [op]: cursorCreatedAt } },
          { createdAt: cursorCreatedAt, id: { [op]: position.id } },
        ],
      });
    }

    if (andClauses.length > 0) where.AND = andClauses;

    return this.prisma.bookmark.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: limit,
    });
  }

  findOne(ownerId: string, id: string): Promise<Bookmark | null> {
    return this.prisma.bookmark.findFirst({ where: { id, ownerId } });
  }

  // Deliberately ownerId-less (CLAUDE.md rule 3 exception, named explicitly):
  // backs the public share-resolve route, where authorization was already
  // established one level up by CollectionRepository.findByShareToken.
  findAllForSharedCollection(
    collectionId: string,
    { limit = DEFAULT_LIMIT, cursor, sort = DEFAULT_SORT }: FindAllOptions = {},
  ): Promise<Bookmark[]> {
    const direction = sort === 'createdAt:asc' ? 'asc' : 'desc';
    const where: Prisma.BookmarkWhereInput = { collectionId };

    if (cursor) {
      const position = decodeCursor(cursor);
      const cursorCreatedAt = new Date(position.createdAt);
      const op = direction === 'desc' ? 'lt' : 'gt';
      where.OR = [
        { createdAt: { [op]: cursorCreatedAt } },
        { createdAt: cursorCreatedAt, id: { [op]: position.id } },
      ];
    }

    return this.prisma.bookmark.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: limit,
    });
  }

  async update(
    ownerId: string,
    id: string,
    // Unchecked variant: PUT needs to set the raw collectionId scalar
    // (including to null) rather than a relation connect/disconnect object.
    data: Prisma.BookmarkUncheckedUpdateInput,
  ): Promise<Bookmark | null> {
    const { count } = await this.prisma.bookmark.updateMany({
      where: { id, ownerId },
      data,
    });
    return count === 0 ? null : this.findOne(ownerId, id);
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.bookmark.deleteMany({
      where: { id, ownerId },
    });
    return count > 0;
  }
}
