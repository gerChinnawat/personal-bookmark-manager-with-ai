import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionRepository } from '../../../database/collection/collection.repository';
import { OWNER_ID } from '../../../test-utils/fixtures';

function makeCollection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '1',
    ownerId: OWNER_ID,
    name: 'Recipes',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CollectionService', () => {
  let service: CollectionService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    setShareEnabled: jest.Mock;
    findByShareToken: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      setShareEnabled: jest.fn(),
      findByShareToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        { provide: CollectionRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(CollectionService);
  });

  describe('create', () => {
    it('strips ownerId from the created collection', async () => {
      repository.create.mockResolvedValue(makeCollection());

      const result = await service.create(OWNER_ID, { name: 'Recipes' });

      expect(repository.create).toHaveBeenCalledWith(OWNER_ID, {
        name: 'Recipes',
      });
      expect(result).not.toHaveProperty('ownerId');
      expect(result).toMatchObject({ id: '1', name: 'Recipes' });
    });
  });

  describe('findAll', () => {
    it('omits ownerId from every returned item', async () => {
      repository.findAll.mockResolvedValue([makeCollection()]);

      const result = await service.findAll(OWNER_ID, { limit: 25 });

      expect(result.items[0]).not.toHaveProperty('ownerId');
    });

    it('returns a nextCursor when a full page is returned', async () => {
      const rows = Array.from({ length: 25 }, (_, i) =>
        makeCollection({ id: `row-${i}` }),
      );
      repository.findAll.mockResolvedValue(rows);

      const result = await service.findAll(OWNER_ID, { limit: 25 });

      expect(result.nextCursor).toBeDefined();
    });

    it('omits nextCursor when fewer rows than the limit are returned', async () => {
      repository.findAll.mockResolvedValue([makeCollection()]);

      const result = await service.findAll(OWNER_ID, { limit: 25 });

      expect(result.nextCursor).toBeUndefined();
    });

    it('defaults limit to 25 when not provided, for the full-page comparison', async () => {
      const rows = Array.from({ length: 25 }, (_, i) =>
        makeCollection({ id: `row-${i}` }),
      );
      repository.findAll.mockResolvedValue(rows);

      const result = await service.findAll(OWNER_ID, {});

      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('omits ownerId from the found collection', async () => {
      repository.findOne.mockResolvedValue(makeCollection());

      const result = await service.findOne(OWNER_ID, '1');

      expect(result).not.toHaveProperty('ownerId');
    });

    it('throws a fixed-message NotFoundException when the repository returns null', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(OWNER_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(OWNER_ID, 'missing')).rejects.toThrow(
        'Collection not found',
      );
    });
  });

  describe('update', () => {
    it('omits ownerId from the updated collection', async () => {
      repository.update.mockResolvedValue(makeCollection({ name: 'New' }));

      const result = await service.update(OWNER_ID, '1', { name: 'New' });

      expect(result).not.toHaveProperty('ownerId');
    });

    it('throws NotFoundException with the fixed message when the repository returns null', async () => {
      repository.update.mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, 'missing', { name: 'New' }),
      ).rejects.toThrow(new NotFoundException('Collection not found'));
    });
  });

  describe('replace', () => {
    it('sends only the name field to the repository', async () => {
      repository.update.mockResolvedValue(makeCollection({ name: 'New' }));

      await service.replace(OWNER_ID, '1', { name: 'New' });

      expect(repository.update).toHaveBeenCalledWith(OWNER_ID, '1', {
        name: 'New',
      });
    });

    it('throws NotFoundException with the fixed message when the repository returns null', async () => {
      repository.update.mockResolvedValue(null);

      await expect(
        service.replace(OWNER_ID, 'missing', { name: 'New' }),
      ).rejects.toThrow(new NotFoundException('Collection not found'));
    });
  });

  describe('remove', () => {
    it('resolves without throwing when the repository removes a row', async () => {
      repository.remove.mockResolvedValue(true);

      await expect(
        service.remove(OWNER_ID, '1'),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundException with the fixed message when nothing was removed', async () => {
      repository.remove.mockResolvedValue(false);

      await expect(service.remove(OWNER_ID, 'missing')).rejects.toThrow(
        new NotFoundException('Collection not found'),
      );
    });
  });

  describe('enableShare', () => {
    it('returns the shareToken from the updated row', async () => {
      repository.setShareEnabled.mockResolvedValue(
        makeCollection({ shareEnabled: true, shareToken: 'tok-123' }),
      );

      const result = await service.enableShare(OWNER_ID, '1');

      expect(repository.setShareEnabled).toHaveBeenCalledWith(
        OWNER_ID,
        '1',
        true,
      );
      expect(result).toEqual({ shareToken: 'tok-123' });
    });

    it('throws NotFoundException with the fixed message when the repository returns null', async () => {
      repository.setShareEnabled.mockResolvedValue(null);

      await expect(service.enableShare(OWNER_ID, 'missing')).rejects.toThrow(
        new NotFoundException('Collection not found'),
      );
    });
  });

  describe('disableShare', () => {
    it('resolves without throwing when the repository disables sharing', async () => {
      repository.setShareEnabled.mockResolvedValue(makeCollection());

      await expect(
        service.disableShare(OWNER_ID, '1'),
      ).resolves.toBeUndefined();
      expect(repository.setShareEnabled).toHaveBeenCalledWith(
        OWNER_ID,
        '1',
        false,
      );
    });

    it('throws NotFoundException with the fixed message when the repository returns null', async () => {
      repository.setShareEnabled.mockResolvedValue(null);

      await expect(
        service.disableShare(OWNER_ID, 'missing'),
      ).rejects.toThrow(new NotFoundException('Collection not found'));
    });
  });

  describe('resolveShare', () => {
    it('omits ownerId and shareToken from the resolved collection', async () => {
      repository.findByShareToken.mockResolvedValue(
        makeCollection({ shareEnabled: true, shareToken: 'tok-123' }),
      );

      const result = await service.resolveShare('tok-123');

      expect(result).not.toHaveProperty('ownerId');
      expect(result).not.toHaveProperty('shareToken');
      expect(result).toMatchObject({ id: '1', name: 'Recipes' });
    });

    it('throws a fixed-message NotFoundException — identical for unknown and disabled tokens', async () => {
      repository.findByShareToken.mockResolvedValue(null);

      await expect(service.resolveShare('bad-token')).rejects.toThrow(
        new NotFoundException('Collection not found'),
      );
    });
  });
});
