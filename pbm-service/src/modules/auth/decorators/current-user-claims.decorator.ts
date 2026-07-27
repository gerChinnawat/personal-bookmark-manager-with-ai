import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

// Full verified JWT payload, for the one route that needs more than sub
// (GET /me — API_DESIGN.md §4). Everywhere else uses @CurrentUser(), which
// only exposes sub, so ownerId derivation stays narrow by default.
export const CurrentUserClaims = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequest['user'] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
