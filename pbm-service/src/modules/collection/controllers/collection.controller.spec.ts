import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionManager } from '../managers/collection.manager';
import { BookmarkManager } from '../../bookmark/managers/bookmark.manager';

const OWNER_ID = 'auth0|owner';

function makeRes() {
  return { set: jest.fn() } as unknown as import('express').Response;
}

describe('CollectionController', () => {
  let controller: CollectionController;
  let collectionManager: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    replace: jest.Mock;
    remove: jest.Mock;
  };
  let bookmarkManager: { findAll: jest.Mock };

  beforeEach(async () => {
    collectionManager = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
    };
    bookmarkManager = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        { provide: CollectionManager, useValue: collectionManager },
        { provide: BookmarkManager, useValue: bookmarkManager },
      ],
    }).compile();

    controller = module.get(CollectionController);
  });

  it('delegates create to the manager', () => {
    const dto = { name: 'Recipes' };
    controller.create(OWNER_ID, dto);
    expect(collectionManager.create).toHaveBeenCalledWith(OWNER_ID, dto);
  });

  describe('findAll', () => {
    it('sets X-Next-Cursor when the manager returns one', async () => {
      const res = makeRes();
      collectionManager.findAll.mockResolvedValue({
        items: [{ id: '1' }],
        nextCursor: 'opaque-cursor',
      });

      const result = await controller.findAll(OWNER_ID, {} as any, res);

      expect(res.set).toHaveBeenCalledWith('X-Next-Cursor', 'opaque-cursor');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('does not set the header when there is no next page', async () => {
      const res = makeRes();
      collectionManager.findAll.mockResolvedValue({
        items: [{ id: '1' }],
        nextCursor: undefined,
      });

      await controller.findAll(OWNER_ID, {} as any, res);

      expect(res.set).not.toHaveBeenCalled();
    });
  });

  it('delegates findOne to the manager', () => {
    controller.findOne(OWNER_ID, '1');
    expect(collectionManager.findOne).toHaveBeenCalledWith(OWNER_ID, '1');
  });

  it('delegates replace to the manager', () => {
    const dto = { name: 'New' };
    controller.replace(OWNER_ID, '1', dto);
    expect(collectionManager.replace).toHaveBeenCalledWith(
      OWNER_ID,
      '1',
      dto,
    );
  });

  it('delegates update to the manager', () => {
    const dto = { name: 'New' };
    controller.update(OWNER_ID, '1', dto);
    expect(collectionManager.update).toHaveBeenCalledWith(OWNER_ID, '1', dto);
  });

  it('delegates remove to the manager', () => {
    controller.remove(OWNER_ID, '1');
    expect(collectionManager.remove).toHaveBeenCalledWith(OWNER_ID, '1');
  });

  describe('findBookmarks', () => {
    it('checks collection ownership before querying bookmarks, and scopes by collectionId', async () => {
      const res = makeRes();
      collectionManager.findOne.mockResolvedValue({ id: '1' });
      bookmarkManager.findAll.mockResolvedValue({
        items: [{ id: 'b1' }],
        nextCursor: undefined,
      });

      const result = await controller.findBookmarks(
        OWNER_ID,
        '1',
        { limit: 25 } as any,
        res,
      );

      expect(collectionManager.findOne).toHaveBeenCalledWith(OWNER_ID, '1');
      expect(bookmarkManager.findAll).toHaveBeenCalledWith(OWNER_ID, {
        limit: 25,
        collectionId: '1',
      });
      expect(result).toEqual([{ id: 'b1' }]);
    });

    it('propagates 404 from the ownership check and never queries bookmarks', async () => {
      const res = makeRes();
      collectionManager.findOne.mockRejectedValue(
        new NotFoundException('Collection not found'),
      );

      await expect(
        controller.findBookmarks(OWNER_ID, 'missing', {} as any, res),
      ).rejects.toThrow(new NotFoundException('Collection not found'));

      expect(bookmarkManager.findAll).not.toHaveBeenCalled();
    });

    it('sets X-Next-Cursor when the bookmark page is full', async () => {
      const res = makeRes();
      collectionManager.findOne.mockResolvedValue({ id: '1' });
      bookmarkManager.findAll.mockResolvedValue({
        items: [{ id: 'b1' }],
        nextCursor: 'opaque-cursor',
      });

      await controller.findBookmarks(OWNER_ID, '1', {} as any, res);

      expect(res.set).toHaveBeenCalledWith('X-Next-Cursor', 'opaque-cursor');
    });
  });
});
