import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './modules/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validationExceptionFactory } from './common/filters/validation-exception-factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
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
  await app.listen(3000);
}
bootstrap();
