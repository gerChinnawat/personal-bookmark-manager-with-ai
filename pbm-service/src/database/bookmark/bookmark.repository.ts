import { Injectable } from '@nestjs/common';
import { Bookmark, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma-service/prisma.service';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

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
      offset = 0,
    }: { limit?: number; offset?: number } = {},
  ): Promise<Bookmark[]> {
    return this.prisma.bookmark.findMany({
      where: { ownerId },
      take: Math.min(limit, MAX_LIMIT),
      skip: offset,
    });
  }

  findOne(ownerId: string, id: string): Promise<Bookmark | null> {
    return this.prisma.bookmark.findFirst({ where: { id, ownerId } });
  }

  async update(
    ownerId: string,
    id: string,
    data: Prisma.BookmarkUpdateInput,
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
