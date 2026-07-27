import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CollectionRepository } from './collection.repository';
import { PrismaService } from '../prisma-service/prisma.service';
import * as cursor from '../../common/pagination/cursor';

const OWNER_ID = 'auth0|owner';
const OTHER_ID = 'auth0|other';

describe('CollectionRepository', () => {
  let repository: CollectionRepository;
  let prisma: {
    collection: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      collection: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(CollectionRepository);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('injects ownerId into the Prisma create data', async () => {
      prisma.collection.create.mockResolvedValue({ id: '1' });

      await repository.create(OWNER_ID, { name: 'Recipes' });

      expect(prisma.collection.create).toHaveBeenCalledWith({
        data: { name: 'Recipes', ownerId: OWNER_ID },
      });
    });
  });

  describe('findAll', () => {
    it('scopes the where clause by ownerId with no other options', async () => {
      prisma.collection.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID);

      expect(prisma.collection.findMany).toHaveBeenCalledWith({
        where: { ownerId: OWNER_ID },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25,
      });
    });

    it('adds a case-insensitive name filter when q is provided', async () => {
      prisma.collection.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { q: 'recipe' });

      expect(prisma.collection.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: OWNER_ID,
          AND: [
            { name: { contains: 'recipe', mode: Prisma.QueryMode.insensitive } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25,
      });
    });

    it('uses asc direction and a > cursor comparison for createdAt:asc', async () => {
      jest
        .spyOn(cursor, 'decodeCursor')
        .mockReturnValue({ createdAt: '2026-01-01T00:00:00.000Z', id: 'row-1' });
      prisma.collection.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, {
        sort: 'createdAt:asc',
        cursor: 'opaque-cursor',
      });

      expect(prisma.collection.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: OWNER_ID,
          AND: [
            {
              OR: [
                { createdAt: { gt: new Date('2026-01-01T00:00:00.000Z') } },
                {
                  createdAt: new Date('2026-01-01T00:00:00.000Z'),
                  id: { gt: 'row-1' },
                },
              ],
            },
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 25,
      });
    });

    it('uses desc direction and a < cursor comparison by default', async () => {
      jest
        .spyOn(cursor, 'decodeCursor')
        .mockReturnValue({ createdAt: '2026-01-01T00:00:00.000Z', id: 'row-1' });
      prisma.collection.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { cursor: 'opaque-cursor' });

      const call = prisma.collection.findMany.mock.calls[0][0];
      const orClause = call.where.AND[0].OR;
      expect(orClause[0]).toEqual({
        createdAt: { lt: new Date('2026-01-01T00:00:00.000Z') },
      });
      expect(orClause[1]).toEqual({
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: { lt: 'row-1' },
      });
    });

    it('respects a custom limit', async () => {
      prisma.collection.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { limit: 5 });

      expect(prisma.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('findOne', () => {
    it('scopes the lookup by id and ownerId together', async () => {
      prisma.collection.findFirst.mockResolvedValue({ id: '1' });

      await repository.findOne(OWNER_ID, '1');

      expect(prisma.collection.findFirst).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
      });
    });

    it('returns null without leaking whether the row exists for another owner', async () => {
      prisma.collection.findFirst.mockResolvedValue(null);

      const result = await repository.findOne(OTHER_ID, '1');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('scopes updateMany by id and ownerId, then re-fetches on success', async () => {
      prisma.collection.updateMany.mockResolvedValue({ count: 1 });
      prisma.collection.findFirst.mockResolvedValue({ id: '1', name: 'New' });

      const result = await repository.update(OWNER_ID, '1', { name: 'New' });

      expect(prisma.collection.updateMany).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
        data: { name: 'New' },
      });
      expect(prisma.collection.findFirst).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
      });
      expect(result).toEqual({ id: '1', name: 'New' });
    });

    it('returns null without a re-fetch when no row matched (wrong owner or missing id)', async () => {
      prisma.collection.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.update(OTHER_ID, '1', { name: 'New' });

      expect(result).toBeNull();
      expect(prisma.collection.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('scopes deleteMany by id and ownerId and returns true on success', async () => {
      prisma.collection.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.remove(OWNER_ID, '1');

      expect(prisma.collection.deleteMany).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
      });
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      prisma.collection.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.remove(OTHER_ID, '1');

      expect(result).toBe(false);
    });
  });
});
