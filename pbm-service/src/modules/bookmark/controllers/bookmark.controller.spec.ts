import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkController } from './bookmark.controller';
import { BookmarkManager } from '../managers/bookmark.manager';
import { OWNER_ID, makeRes } from '../../../test-utils/fixtures';

describe('BookmarkController', () => {
  let controller: BookmarkController;
  let bookmarkManager: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    replace: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    bookmarkManager = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [{ provide: BookmarkManager, useValue: bookmarkManager }],
    }).compile();

    controller = module.get(BookmarkController);
  });

  it('delegates create to the manager', () => {
    const dto = { url: 'https://nestjs.com', title: 'NestJS' };
    controller.create(OWNER_ID, dto);
    expect(bookmarkManager.create).toHaveBeenCalledWith(OWNER_ID, dto);
  });

  describe('findAll', () => {
    it('sets X-Next-Cursor when the manager returns one', async () => {
      const res = makeRes();
      bookmarkManager.findAll.mockResolvedValue({
        items: [{ id: '1' }],
        nextCursor: 'opaque-cursor',
      });

      const result = await controller.findAll(OWNER_ID, {} as any, res);

      expect(res.set).toHaveBeenCalledWith('X-Next-Cursor', 'opaque-cursor');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('does not set the header when there is no next page', async () => {
      const res = makeRes();
      bookmarkManager.findAll.mockResolvedValue({
        items: [{ id: '1' }],
        nextCursor: undefined,
      });

      await controller.findAll(OWNER_ID, {} as any, res);

      expect(res.set).not.toHaveBeenCalled();
    });
  });

  it('delegates findOne to the manager', () => {
    controller.findOne(OWNER_ID, '1');
    expect(bookmarkManager.findOne).toHaveBeenCalledWith(OWNER_ID, '1');
  });

  it('delegates replace to the manager', () => {
    const dto = { url: 'https://nestjs.com', title: 'New' };
    controller.replace(OWNER_ID, '1', dto);
    expect(bookmarkManager.replace).toHaveBeenCalledWith(OWNER_ID, '1', dto);
  });

  it('delegates update to the manager', () => {
    const dto = { title: 'New' };
    controller.update(OWNER_ID, '1', dto);
    expect(bookmarkManager.update).toHaveBeenCalledWith(OWNER_ID, '1', dto);
  });

  it('delegates remove to the manager', () => {
    controller.remove(OWNER_ID, '1');
    expect(bookmarkManager.remove).toHaveBeenCalledWith(OWNER_ID, '1');
  });
});
