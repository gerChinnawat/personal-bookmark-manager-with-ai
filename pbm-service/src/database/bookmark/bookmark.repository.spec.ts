import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BookmarkRepository } from './bookmark.repository';
import { PrismaService } from '../prisma-service/prisma.service';
import * as cursor from '../../common/pagination/cursor';

const OWNER_ID = 'auth0|owner';
const OTHER_ID = 'auth0|other';

describe('BookmarkRepository', () => {
  let repository: BookmarkRepository;
  let prisma: {
    bookmark: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      bookmark: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(BookmarkRepository);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('injects ownerId into the Prisma create data', async () => {
      prisma.bookmark.create.mockResolvedValue({ id: '1' });

      await repository.create(OWNER_ID, {
        url: 'https://nestjs.com',
        title: 'NestJS',
      });

      expect(prisma.bookmark.create).toHaveBeenCalledWith({
        data: {
          url: 'https://nestjs.com',
          title: 'NestJS',
          ownerId: OWNER_ID,
        },
      });
    });
  });

  describe('findAll', () => {
    it('scopes the where clause by ownerId with no other options', async () => {
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID);

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith({
        where: { ownerId: OWNER_ID },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25,
      });
    });

    it('filters by collectionId when provided', async () => {
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { collectionId: 'col-1' });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OWNER_ID, collectionId: 'col-1' },
        }),
      );
    });

    it('filters to collectionId: null when uncategorised is true', async () => {
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { uncategorised: true });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OWNER_ID, collectionId: null },
        }),
      );
    });

    it('prefers uncategorised over collectionId when both are set', async () => {
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, {
        collectionId: 'col-1',
        uncategorised: true,
      });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: OWNER_ID, collectionId: null },
        }),
      );
    });

    it('matches q against both title and notes, case-insensitively', async () => {
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { q: 'nest' });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerId: OWNER_ID,
            AND: [
              {
                OR: [
                  { title: { contains: 'nest', mode: Prisma.QueryMode.insensitive } },
                  { notes: { contains: 'nest', mode: Prisma.QueryMode.insensitive } },
                ],
              },
            ],
          },
        }),
      );
    });

    it('uses asc direction and a > cursor comparison for createdAt:asc', async () => {
      jest
        .spyOn(cursor, 'decodeCursor')
        .mockReturnValue({ createdAt: '2026-01-01T00:00:00.000Z', id: 'row-1' });
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, {
        sort: 'createdAt:asc',
        cursor: 'opaque-cursor',
      });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith({
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
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { cursor: 'opaque-cursor' });

      const call = prisma.bookmark.findMany.mock.calls[0][0];
      const orClause = call.where.AND[0].OR;
      expect(orClause[0]).toEqual({
        createdAt: { lt: new Date('2026-01-01T00:00:00.000Z') },
      });
      expect(orClause[1]).toEqual({
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: { lt: 'row-1' },
      });
    });

    it('combines the q clause and the cursor clause as separate AND entries', async () => {
      jest
        .spyOn(cursor, 'decodeCursor')
        .mockReturnValue({ createdAt: '2026-01-01T00:00:00.000Z', id: 'row-1' });
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { q: 'nest', cursor: 'opaque-cursor' });

      const call = prisma.bookmark.findMany.mock.calls[0][0];
      expect(call.where.AND).toHaveLength(2);
    });

    it('respects a custom limit', async () => {
      prisma.bookmark.findMany.mockResolvedValue([]);

      await repository.findAll(OWNER_ID, { limit: 5 });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('findOne', () => {
    it('scopes the lookup by id and ownerId together', async () => {
      prisma.bookmark.findFirst.mockResolvedValue({ id: '1' });

      await repository.findOne(OWNER_ID, '1');

      expect(prisma.bookmark.findFirst).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
      });
    });

    it('returns null without leaking whether the row exists for another owner', async () => {
      prisma.bookmark.findFirst.mockResolvedValue(null);

      const result = await repository.findOne(OTHER_ID, '1');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('scopes updateMany by id and ownerId, then re-fetches on success', async () => {
      prisma.bookmark.updateMany.mockResolvedValue({ count: 1 });
      prisma.bookmark.findFirst.mockResolvedValue({ id: '1', title: 'New' });

      const result = await repository.update(OWNER_ID, '1', { title: 'New' });

      expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
        data: { title: 'New' },
      });
      expect(prisma.bookmark.findFirst).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
      });
      expect(result).toEqual({ id: '1', title: 'New' });
    });

    it('returns null without a re-fetch when no row matched (wrong owner or missing id)', async () => {
      prisma.bookmark.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.update(OTHER_ID, '1', { title: 'New' });

      expect(result).toBeNull();
      expect(prisma.bookmark.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('scopes deleteMany by id and ownerId and returns true on success', async () => {
      prisma.bookmark.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.remove(OWNER_ID, '1');

      expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
        where: { id: '1', ownerId: OWNER_ID },
      });
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      prisma.bookmark.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.remove(OTHER_ID, '1');

      expect(result).toBe(false);
    });
  });
});
