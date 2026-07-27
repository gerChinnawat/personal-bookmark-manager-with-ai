import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { IS_PUBLIC_KEY } from './public.decorator';

// Fixed string only — never interpolate anything from the request or token
// into the message (API_DESIGN.md §6).
const UNAUTHENTICATED_MESSAGE = 'Unauthenticated';

const JWKS_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  user: JWTPayload & { sub: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly reflector: Reflector) {
    const issuer = process.env.AUTH0_ISSUER;
    const audience = process.env.AUTH0_AUDIENCE;
    const jwksUri = process.env.AUTH0_JWKS_URI;
    if (!issuer || !audience || !jwksUri) {
      // Fail at boot, not per-request: a misconfigured guard must never fall
      // open or turn into a runtime 500 storm.
      throw new Error(
        'JwtAuthGuard: AUTH0_ISSUER, AUTH0_AUDIENCE and AUTH0_JWKS_URI must be set',
      );
    }
    this.issuer = issuer;
    this.audience = audience;
    // jose refetches automatically on an unknown `kid`; cacheMaxAge bounds
    // how long a known key set is reused (API_DESIGN.md §1: 10 minutes).
    this.jwks = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);

    let payload: JWTPayload;
    try {
      // `audience` matches whether the token's `aud` is a scalar or an array
      // (the live Auth0 access token carries an array — README "Auth0
      // configuration"). `exp` is always enforced; `nbf` is enforced when
      // present (Auth0 does not issue it). `alg` is pinned — the token
      // header's alg is never trusted.
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
      }));
    } catch {
      // Deliberately swallow the cause: expired, bad signature, wrong aud
      // (e.g. an ID token) and unknown kid must all be indistinguishable
      // 401s to the caller. Details are not serialised (API_DESIGN.md §6).
      throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);
    }

    if (!payload.sub) throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE);

    request.user = payload as AuthenticatedRequest['user'];
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token, ...rest] = header.split(' ');
    if (scheme !== 'Bearer' || !token || rest.length > 0) return null;
    return token;
  }
}
