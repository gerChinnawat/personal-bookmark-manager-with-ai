import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkRepository } from '../../../database/bookmark/bookmark.repository';
import { CollectionRepository } from '../../../database/collection/collection.repository';
import { encodeCursor } from '../../../common/pagination/cursor';
import { OWNER_ID } from '../../../test-utils/fixtures';

function makeBookmark(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '1',
    ownerId: OWNER_ID,
    url: 'https://nestjs.com',
    title: 'NestJS',
    notes: null,
    collectionId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('BookmarkService', () => {
  let service: BookmarkService;
  let bookmarkRepository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let collectionRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    bookmarkRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    collectionRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkService,
        { provide: BookmarkRepository, useValue: bookmarkRepository },
        { provide: CollectionRepository, useValue: collectionRepository },
      ],
    }).compile();

    service = module.get(BookmarkService);
  });

  describe('create', () => {
    it('creates without checking collection ownership when no collectionId is given', async () => {
      bookmarkRepository.create.mockResolvedValue(makeBookmark());

      await service.create(OWNER_ID, {
        url: 'https://nestjs.com',
        title: 'NestJS',
      });

      expect(collectionRepository.findOne).not.toHaveBeenCalled();
      expect(bookmarkRepository.create).toHaveBeenCalledWith(OWNER_ID, {
        url: 'https://nestjs.com',
        title: 'NestJS',
      });
    });

    it('strips ownerId from the created bookmark', async () => {
      bookmarkRepository.create.mockResolvedValue(makeBookmark());

      const result = await service.create(OWNER_ID, {
        url: 'https://nestjs.com',
        title: 'NestJS',
      });

      expect(result).not.toHaveProperty('ownerId');
    });

    it('checks the collection belongs to the caller before creating, when collectionId is given', async () => {
      collectionRepository.findOne.mockResolvedValue({ id: 'col-1' });
      bookmarkRepository.create.mockResolvedValue(
        makeBookmark({ collectionId: 'col-1' }),
      );

      await service.create(OWNER_ID, {
        url: 'https://nestjs.com',
        title: 'NestJS',
        collectionId: 'col-1',
      });

      expect(collectionRepository.findOne).toHaveBeenCalledWith(
        OWNER_ID,
        'col-1',
      );
      expect(bookmarkRepository.create).toHaveBeenCalledWith(OWNER_ID, {
        url: 'https://nestjs.com',
        title: 'NestJS',
        collectionId: 'col-1',
      });
    });

    it('throws Collection not found and never creates the bookmark when the collection is not the caller\'s', async () => {
      collectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, {
          url: 'https://nestjs.com',
          title: 'NestJS',
          collectionId: 'foreign-col',
        }),
      ).rejects.toThrow(new NotFoundException('Collection not found'));

      expect(bookmarkRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('omits ownerId from every returned item', async () => {
      bookmarkRepository.findAll.mockResolvedValue([makeBookmark()]);

      const result = await service.findAll(OWNER_ID, { limit: 25 });

      expect(result.items[0]).not.toHaveProperty('ownerId');
    });

    it('returns a nextCursor when a full page is returned', async () => {
      const rows = Array.from({ length: 25 }, (_, i) =>
        makeBookmark({ id: `row-${i}` }),
      );
      bookmarkRepository.findAll.mockResolvedValue(rows);

      const result = await service.findAll(OWNER_ID, { limit: 25 });

      const lastRow = rows[rows.length - 1];
      expect(result.nextCursor).toBe(
        encodeCursor({
          createdAt: lastRow.createdAt.toISOString(),
          id: lastRow.id,
        }),
      );
    });

    it('omits nextCursor when fewer rows than the limit are returned', async () => {
      bookmarkRepository.findAll.mockResolvedValue([makeBookmark()]);

      const result = await service.findAll(OWNER_ID, { limit: 25 });

      expect(result.nextCursor).toBeUndefined();
    });

    it('does not check collection ownership when no collectionId filter is given', async () => {
      bookmarkRepository.findAll.mockResolvedValue([]);

      await service.findAll(OWNER_ID, { limit: 25 });

      expect(collectionRepository.findOne).not.toHaveBeenCalled();
    });

    it('checks collection ownership before listing when filtering by collectionId', async () => {
      collectionRepository.findOne.mockResolvedValue({ id: 'col-1' });
      bookmarkRepository.findAll.mockResolvedValue([]);

      await service.findAll(OWNER_ID, { collectionId: 'col-1' });

      expect(collectionRepository.findOne).toHaveBeenCalledWith(
        OWNER_ID,
        'col-1',
      );
      expect(bookmarkRepository.findAll).toHaveBeenCalled();
    });

    it('throws Collection not found and never lists bookmarks for a foreign collectionId filter', async () => {
      collectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAll(OWNER_ID, { collectionId: 'foreign-col' }),
      ).rejects.toThrow(new NotFoundException('Collection not found'));

      expect(bookmarkRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('omits ownerId from the found bookmark', async () => {
      bookmarkRepository.findOne.mockResolvedValue(makeBookmark());

      const result = await service.findOne(OWNER_ID, '1');

      expect(result).not.toHaveProperty('ownerId');
    });

    it('throws a fixed-message NotFoundException when the repository returns null', async () => {
      bookmarkRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(OWNER_ID, 'missing')).rejects.toThrow(
        new NotFoundException('Bookmark not found'),
      );
    });
  });

  describe('update', () => {
    it('updates without checking collection ownership when collectionId is absent', async () => {
      bookmarkRepository.update.mockResolvedValue(
        makeBookmark({ title: 'New' }),
      );

      await service.update(OWNER_ID, '1', { title: 'New' });

      expect(collectionRepository.findOne).not.toHaveBeenCalled();
      expect(bookmarkRepository.update).toHaveBeenCalledWith(OWNER_ID, '1', {
        title: 'New',
      });
    });

    it('checks collection ownership before updating when collectionId is present', async () => {
      collectionRepository.findOne.mockResolvedValue({ id: 'col-1' });
      bookmarkRepository.update.mockResolvedValue(
        makeBookmark({ collectionId: 'col-1' }),
      );

      await service.update(OWNER_ID, '1', { collectionId: 'col-1' });

      expect(collectionRepository.findOne).toHaveBeenCalledWith(
        OWNER_ID,
        'col-1',
      );
    });

    it('throws Collection not found and never updates when the collection is not the caller\'s', async () => {
      collectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, '1', { collectionId: 'foreign-col' }),
      ).rejects.toThrow(new NotFoundException('Collection not found'));

      expect(bookmarkRepository.update).not.toHaveBeenCalled();
    });

    it('throws a fixed-message NotFoundException when the repository returns null', async () => {
      bookmarkRepository.update.mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, 'missing', { title: 'New' }),
      ).rejects.toThrow(new NotFoundException('Bookmark not found'));
    });
  });

  describe('replace', () => {
    it('nulls out notes and collectionId when absent from the DTO', async () => {
      bookmarkRepository.update.mockResolvedValue(makeBookmark());

      await service.replace(OWNER_ID, '1', {
        url: 'https://nestjs.com',
        title: 'NestJS',
      });

      expect(bookmarkRepository.update).toHaveBeenCalledWith(OWNER_ID, '1', {
        url: 'https://nestjs.com',
        title: 'NestJS',
        notes: null,
        collectionId: null,
      });
    });

    it('checks collection ownership before replacing when collectionId is present', async () => {
      collectionRepository.findOne.mockResolvedValue({ id: 'col-1' });
      bookmarkRepository.update.mockResolvedValue(
        makeBookmark({ collectionId: 'col-1' }),
      );

      await service.replace(OWNER_ID, '1', {
        url: 'https://nestjs.com',
        title: 'NestJS',
        collectionId: 'col-1',
      });

      expect(collectionRepository.findOne).toHaveBeenCalledWith(
        OWNER_ID,
        'col-1',
      );
      expect(bookmarkRepository.update).toHaveBeenCalledWith(OWNER_ID, '1', {
        url: 'https://nestjs.com',
        title: 'NestJS',
        notes: null,
        collectionId: 'col-1',
      });
    });

    it('throws Collection not found and never replaces when the collection is not the caller\'s', async () => {
      collectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.replace(OWNER_ID, '1', {
          url: 'https://nestjs.com',
          title: 'NestJS',
          collectionId: 'foreign-col',
        }),
      ).rejects.toThrow(new NotFoundException('Collection not found'));

      expect(bookmarkRepository.update).not.toHaveBeenCalled();
    });

    it('throws a fixed-message NotFoundException when the repository returns null', async () => {
      bookmarkRepository.update.mockResolvedValue(null);

      await expect(
        service.replace(OWNER_ID, 'missing', {
          url: 'https://nestjs.com',
          title: 'NestJS',
        }),
      ).rejects.toThrow(new NotFoundException('Bookmark not found'));
    });
  });

  describe('remove', () => {
    it('resolves without throwing when the repository removes a row', async () => {
      bookmarkRepository.remove.mockResolvedValue(true);

      await expect(service.remove(OWNER_ID, '1')).resolves.toBeUndefined();
    });

    it('throws a fixed-message NotFoundException when nothing was removed', async () => {
      bookmarkRepository.remove.mockResolvedValue(false);

      await expect(service.remove(OWNER_ID, 'missing')).rejects.toThrow(
        new NotFoundException('Bookmark not found'),
      );
    });
  });
});
