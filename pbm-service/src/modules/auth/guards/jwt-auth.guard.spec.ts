import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.Mock;

const ENV = {
  AUTH0_ISSUER: 'https://dev-test.us.auth0.com/',
  AUTH0_AUDIENCE: 'https://bbl-candidate-test-api',
  AUTH0_JWKS_URI: 'https://dev-test.us.auth0.com/.well-known/jwks.json',
};

function makeContext(options: {
  authHeader?: string;
  isPublic?: boolean;
}): { context: ExecutionContext; request: Record<string, unknown> } {
  const request: Record<string, unknown> = {
    headers: options.authHeader ? { authorization: options.authHeader } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...ENV };
    mockedJwtVerify.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeGuard(isPublic = false) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;
    return new JwtAuthGuard(reflector);
  }

  describe('construction', () => {
    it('throws at boot when AUTH0_ISSUER is missing', () => {
      delete process.env.AUTH0_ISSUER;
      const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
      expect(() => new JwtAuthGuard(reflector)).toThrow();
    });

    it('throws at boot when AUTH0_AUDIENCE is missing', () => {
      delete process.env.AUTH0_AUDIENCE;
      const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
      expect(() => new JwtAuthGuard(reflector)).toThrow();
    });

    it('throws at boot when AUTH0_JWKS_URI is missing', () => {
      delete process.env.AUTH0_JWKS_URI;
      const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
      expect(() => new JwtAuthGuard(reflector)).toThrow();
    });
  });

  describe('@Public() routes', () => {
    it('bypasses token verification entirely', async () => {
      const guard = makeGuard(true);
      const { context } = makeContext({});

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(mockedJwtVerify).not.toHaveBeenCalled();
    });

    it('checks the metadata key IS_PUBLIC_KEY on both handler and class', async () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(true),
      } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector);
      const { context } = makeContext({});

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.any(Array),
      );
    });
  });

  describe('missing or malformed Authorization header', () => {
    it('rejects when no Authorization header is present', async () => {
      const guard = makeGuard();
      const { context } = makeContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Unauthenticated'),
      );
      expect(mockedJwtVerify).not.toHaveBeenCalled();
    });

    it('rejects a non-Bearer scheme', async () => {
      const guard = makeGuard();
      const { context } = makeContext({ authHeader: 'Basic abc123' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Unauthenticated'),
      );
    });

    it('rejects a header with extra segments', async () => {
      const guard = makeGuard();
      const { context } = makeContext({ authHeader: 'Bearer abc 123' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Unauthenticated'),
      );
    });

    it('rejects "Bearer" with no token', async () => {
      const guard = makeGuard();
      const { context } = makeContext({ authHeader: 'Bearer' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Unauthenticated'),
      );
    });
  });

  describe('token verification', () => {
    it('rejects with the same generic message regardless of why jwtVerify failed', async () => {
      const guard = makeGuard();
      const { context } = makeContext({ authHeader: 'Bearer sometoken' });
      mockedJwtVerify.mockRejectedValue(new Error('signature verification failed'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Unauthenticated'),
      );
    });

    it('rejects a token whose payload has no sub claim', async () => {
      const guard = makeGuard();
      const { context } = makeContext({ authHeader: 'Bearer sometoken' });
      mockedJwtVerify.mockResolvedValue({ payload: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Unauthenticated'),
      );
    });

    it('verifies against the configured issuer, audience, and RS256 only', async () => {
      const guard = makeGuard();
      const { context } = makeContext({ authHeader: 'Bearer sometoken' });
      mockedJwtVerify.mockResolvedValue({ payload: { sub: 'auth0|user-a' } });

      await guard.canActivate(context);

      expect(mockedJwtVerify).toHaveBeenCalledWith(
        'sometoken',
        expect.anything(),
        {
          issuer: ENV.AUTH0_ISSUER,
          audience: ENV.AUTH0_AUDIENCE,
          algorithms: ['RS256'],
        },
      );
    });

    it('attaches the verified payload to request.user and allows the request through', async () => {
      const guard = makeGuard();
      const { context, request } = makeContext({
        authHeader: 'Bearer sometoken',
      });
      mockedJwtVerify.mockResolvedValue({
        payload: { sub: 'auth0|user-a', email: 'a@example.com' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({
        sub: 'auth0|user-a',
        email: 'a@example.com',
      });
    });
  });
});
