import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  // The only public route: liveness probe, returns no data (API_DESIGN.md §1).
  @Public()
  @Get()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
