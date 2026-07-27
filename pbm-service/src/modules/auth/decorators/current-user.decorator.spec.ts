import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

// NestJS wraps createParamDecorator's factory in metadata rather than
// exposing it directly; this is the documented way to unit test it without
// spinning up a full request pipeline.
function getParamDecoratorFactory<T>(decorator: Function): T {
  class TestDecorator {
    public test(@decorator() _value: unknown) {}
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestDecorator, 'test');
  return args[Object.keys(args)[0]].factory;
}

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser', () => {
  const factory = getParamDecoratorFactory<
    (data: unknown, ctx: ExecutionContext) => string
  >(CurrentUser);

  it('extracts ownerId from the verified JWT sub claim', () => {
    const ctx = makeContext({ user: { sub: 'auth0|user-a' } });

    expect(factory(undefined, ctx)).toBe('auth0|user-a');
  });

  it('never reads ownerId from the request body or query, even if present', () => {
    const ctx = makeContext({
      user: { sub: 'auth0|real-owner' },
      body: { ownerId: 'auth0|spoofed' },
      query: { ownerId: 'auth0|spoofed' },
    });

    expect(factory(undefined, ctx)).toBe('auth0|real-owner');
  });
});
