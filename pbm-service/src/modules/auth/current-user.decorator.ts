import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard';

// ownerId is the verified JWT's `sub`, set by JwtAuthGuard, and nothing else
// (CLAUDE.md rule 2). The guard has already rejected any request without a
// verified `sub`, so this never runs against an unauthenticated request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user.sub;
  },
);
