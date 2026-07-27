import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserClaims } from '../decorators/current-user-claims.decorator';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

@ApiTags('me')
@ApiBearerAuth('access-token')
@Controller('me')
export class MeController {
  // Claims only — no DB lookup, no upsert. There is no separate Users
  // table; ownerId *is* sub (API_DESIGN.md §4).
  @Get()
  me(@CurrentUserClaims() user: AuthenticatedRequest['user']) {
    return { sub: user.sub, email: user.email, name: user.name };
  }
}
