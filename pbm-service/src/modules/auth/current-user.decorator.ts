import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// TEMP STUB: no auth guard exists yet, so there is no verified JWT to read
// `sub` from. Every request is treated as this single fixed owner until the
// real guard + JWKS verification lands (CLAUDE.md: ownerId must come only
// from a verified token). Replace this with the real implementation before
// any endpoint using it is considered done.
const STUB_OWNER_ID = 'stub-owner-id';

export const CurrentUser = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string => {
    return STUB_OWNER_ID;
  },
);
