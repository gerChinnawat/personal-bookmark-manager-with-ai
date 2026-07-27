import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkManager } from './bookmark.manager';
import { BookmarkService } from '../services/bookmark.service';

const OWNER_ID = 'auth0|owner';

describe('BookmarkManager', () => {
  let manager: BookmarkManager;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    replace: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkManager,
        { provide: BookmarkService, useValue: service },
      ],
    }).compile();

    manager = module.get(BookmarkManager);
  });

  it('delegates create to the service', () => {
    const dto = { url: 'https://nestjs.com', title: 'NestJS' };
    manager.create(OWNER_ID, dto);
    expect(service.create).toHaveBeenCalledWith(OWNER_ID, dto);
  });

  it('delegates findAll to the service', () => {
    const query = { limit: 25 };
    manager.findAll(OWNER_ID, query as any);
    expect(service.findAll).toHaveBeenCalledWith(OWNER_ID, query);
  });

  it('delegates findOne to the service', () => {
    manager.findOne(OWNER_ID, '1');
    expect(service.findOne).toHaveBeenCalledWith(OWNER_ID, '1');
  });

  it('delegates update to the service', () => {
    const dto = { title: 'New' };
    manager.update(OWNER_ID, '1', dto);
    expect(service.update).toHaveBeenCalledWith(OWNER_ID, '1', dto);
  });

  it('delegates replace to the service', () => {
    const dto = { url: 'https://nestjs.com', title: 'New' };
    manager.replace(OWNER_ID, '1', dto);
    expect(service.replace).toHaveBeenCalledWith(OWNER_ID, '1', dto);
  });

  it('delegates remove to the service', () => {
    manager.remove(OWNER_ID, '1');
    expect(service.remove).toHaveBeenCalledWith(OWNER_ID, '1');
  });
});
