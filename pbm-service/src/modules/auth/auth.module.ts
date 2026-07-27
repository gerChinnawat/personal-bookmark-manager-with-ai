import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

// Registers the guard globally via APP_GUARD: every route in every module is
// denied by default; only @Public() opts out (API_DESIGN.md §1).
@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
