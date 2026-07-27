import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validationExceptionFactory } from './common/filters/validation-exception-factory';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // Query DTOs (limit/cursor/sort/...) arrive as strings; transform
      // coerces them to the declared types before validation runs.
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Docs only — every route still goes through the global auth guard, so
  // "Authorize" in the UI needs a real access token (API_DESIGN.md §1).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Personal Bookmark Manager API')
    .setDescription('See API_DESIGN.md at the repo root for the full contract.')
    .setVersion('0.0.1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(3000);
}
bootstrap();
