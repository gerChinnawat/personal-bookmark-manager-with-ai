import { Controller, Get } from '@nestjs/common';
import { CurrentUserClaims } from '../decorators/current-user-claims.decorator';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

@Controller('me')
export class MeController {
  // Claims only — no DB lookup, no upsert. There is no separate Users
  // table; ownerId *is* sub (API_DESIGN.md §4).
  @Get()
  me(@CurrentUserClaims() user: AuthenticatedRequest['user']) {
    return { sub: user.sub, email: user.email, name: user.name };
  }
}
