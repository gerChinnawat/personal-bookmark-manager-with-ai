import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MeController } from './controllers/me.controller';

// Registers the guard globally via APP_GUARD: every route in every module is
// denied by default; only @Public() opts out (API_DESIGN.md §1). MeController
// is deliberately NOT @Public() — GET /me still requires a verified token.
@Module({
  controllers: [MeController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
