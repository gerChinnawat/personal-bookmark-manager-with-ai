import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Opt-out marker for the global deny-by-default JwtAuthGuard. The only route
// allowed to carry this is GET /health (API_DESIGN.md §1).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
