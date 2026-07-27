import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  it('wraps a 404 NotFoundException with the fixed message and NOT_FOUND code, no details', () => {
    const { host, response } = makeHost();

    filter.catch(new NotFoundException('Collection not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    const body = response.json.mock.calls[0][0];
    expect(body.status).toBe(false);
    expect(body.message).toBe('Collection not found');
    expect(body.data.code).toBe('NOT_FOUND');
    expect(body.data.details).toBeUndefined();
    expect(typeof body.data.requestId).toBe('string');
  });

  it('wraps a 401 UnauthorizedException with UNAUTHENTICATED code', () => {
    const { host, response } = makeHost();

    filter.catch(new UnauthorizedException('Unauthenticated'), host);

    expect(response.status).toHaveBeenCalledWith(401);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Unauthenticated');
    expect(body.data.code).toBe('UNAUTHENTICATED');
  });

  it('attaches details only for 400 BadRequestException bodies that carry them', () => {
    const { host, response } = makeHost();
    const details = [{ field: 'name', issue: 'name must be longer than 1' }];

    filter.catch(
      new BadRequestException({ message: 'Validation failed', details }),
      host,
    );

    const body = response.json.mock.calls[0][0];
    expect(response.status).toHaveBeenCalledWith(400);
    expect(body.message).toBe('Validation failed');
    expect(body.data.details).toEqual(details);
    expect(body.data.code).toBe('BAD_REQUEST');
  });

  it('does not attach details to a non-400 exception even if the body happens to carry them', () => {
    const { host, response } = makeHost();

    filter.catch(
      new ConflictException({ message: 'Conflict', details: [{ field: 'x', issue: 'y' }] }),
      host,
    );

    const body = response.json.mock.calls[0][0];
    expect(body.data.details).toBeUndefined();
  });

  it('falls back to a fixed message when a string-body exception carries no message', () => {
    const { host, response } = makeHost();

    filter.catch(new HttpException('', HttpStatus.NOT_FOUND), host);

    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Resource not found');
  });

  it('uses ERROR as the code for a status with no explicit mapping', () => {
    const { host, response } = makeHost();
    const teapot = new BadRequestException();
    jest.spyOn(teapot, 'getStatus').mockReturnValue(418);

    filter.catch(teapot, host);

    const body = response.json.mock.calls[0][0];
    expect(body.data.code).toBe('ERROR');
  });

  it('maps a Prisma unique-constraint violation (P2002) to 409 without leaking the constraint', () => {
    const { host, response } = makeHost();
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`ownerId`,`name`)', {
      code: 'P2002',
      clientVersion: '5.22.0',
    });

    filter.catch(prismaError, host);

    expect(response.status).toHaveBeenCalledWith(409);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Resource already exists');
    expect(body.data.code).toBe('CONFLICT');
    expect(JSON.stringify(body)).not.toContain('ownerId');
  });

  it('maps any other Prisma known-request error to a generic 500', () => {
    const { host, response } = makeHost();
    const prismaError = new Prisma.PrismaClientKnownRequestError('some internal detail', {
      code: 'P2025',
      clientVersion: '5.22.0',
    });

    filter.catch(prismaError, host);

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(body.data.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('some internal detail');
  });

  it('maps an unknown thrown value to a generic 500 without leaking its contents', () => {
    const { host, response } = makeHost();

    filter.catch(new Error('database password is hunter2'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(body.data.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('generates a distinct requestId per response', () => {
    const { host: host1, response: response1 } = makeHost();
    const { host: host2, response: response2 } = makeHost();

    filter.catch(new NotFoundException('Collection not found'), host1);
    filter.catch(new NotFoundException('Collection not found'), host2);

    const id1 = response1.json.mock.calls[0][0].data.requestId;
    const id2 = response2.json.mock.calls[0][0].data.requestId;
    expect(id1).not.toEqual(id2);
  });
});
