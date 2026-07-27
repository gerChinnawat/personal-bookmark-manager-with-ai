import { Injectable } from '@nestjs/common';
import { Collection, Prisma } from '@prisma/client';
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
}

@Injectable()
export class CollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    ownerId: string,
    data: Omit<Prisma.CollectionCreateInput, 'ownerId'>,
  ): Promise<Collection> {
    return this.prisma.collection.create({ data: { ...data, ownerId } });
  }

  findAll(
    ownerId: string,
    {
      limit = DEFAULT_LIMIT,
      cursor,
      sort = DEFAULT_SORT,
      q,
    }: FindAllOptions = {},
  ): Promise<Collection[]> {
    const direction = sort === 'createdAt:asc' ? 'asc' : 'desc';
    const where: Prisma.CollectionWhereInput = { ownerId };

    // Collection has no notes field, so q matches name only (unlike
    // Bookmark's title+notes) — see API_DESIGN.md §5.
    const andClauses: Prisma.CollectionWhereInput[] = [];

    if (q) {
      andClauses.push({
        name: { contains: q, mode: Prisma.QueryMode.insensitive },
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

    return this.prisma.collection.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: limit,
    });
  }

  findOne(ownerId: string, id: string): Promise<Collection | null> {
    return this.prisma.collection.findFirst({ where: { id, ownerId } });
  }

  async update(
    ownerId: string,
    id: string,
    data: Prisma.CollectionUpdateInput,
  ): Promise<Collection | null> {
    const { count } = await this.prisma.collection.updateMany({
      where: { id, ownerId },
      data,
    });
    return count === 0 ? null : this.findOne(ownerId, id);
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.collection.deleteMany({
      where: { id, ownerId },
    });
    return count > 0;
  }
}
