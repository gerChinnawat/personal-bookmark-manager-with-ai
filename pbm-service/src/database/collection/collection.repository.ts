import { Injectable } from '@nestjs/common';
import { Collection, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma-service/prisma.service';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

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
      offset = 0,
    }: { limit?: number; offset?: number } = {},
  ): Promise<Collection[]> {
    return this.prisma.collection.findMany({
      where: { ownerId },
      take: Math.min(limit, MAX_LIMIT),
      skip: offset,
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
