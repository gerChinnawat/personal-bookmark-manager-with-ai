import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

function makeContext(method: string, statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
      getRequest: () => ({ method }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(data: unknown): CallHandler {
  return { handle: () => of(data) };
}

describe('ResponseEnvelopeInterceptor', () => {
  let interceptor: ResponseEnvelopeInterceptor;

  beforeEach(() => {
    interceptor = new ResponseEnvelopeInterceptor();
  });

  it.each([
    ['GET', 'OK'],
    ['POST', 'Created'],
    ['PUT', 'Updated'],
    ['PATCH', 'Updated'],
    ['DELETE', 'Deleted'],
  ])('wraps a %s response with message "%s"', async (method, message) => {
    const context = makeContext(method, HttpStatus.OK);
    const handler = makeHandler({ id: '1' });

    const result = await new Promise((resolve) =>
      interceptor.intercept(context, handler).subscribe(resolve),
    );

    expect(result).toEqual({ status: true, message, data: { id: '1' } });
  });

  it('falls back to "OK" for an unmapped HTTP method', async () => {
    const context = makeContext('OPTIONS', HttpStatus.OK);
    const handler = makeHandler({ id: '1' });

    const result = await new Promise((resolve) =>
      interceptor.intercept(context, handler).subscribe(resolve),
    );

    expect((result as { message: string }).message).toBe('OK');
  });

  it('leaves a 204 No Content response body untouched', async () => {
    const context = makeContext('DELETE', HttpStatus.NO_CONTENT);
    const handler = makeHandler(undefined);

    const result = await new Promise((resolve) =>
      interceptor.intercept(context, handler).subscribe(resolve),
    );

    expect(result).toBeUndefined();
  });
});
