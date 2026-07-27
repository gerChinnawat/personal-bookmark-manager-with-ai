import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Response } from 'express';

// The single exception filter for API_DESIGN.md §6: every error response
// funnels through here so the {status, message, data} envelope shape matches
// ResponseEnvelopeInterceptor's success-side wrapping. `message` is always a
// fixed string already chosen by the throwing code (services only ever throw
// with constants, never interpolated values) — this filter does not invent
// new message text, it only wraps and redacts.

interface ErrorDetail {
  field: string;
  issue: string;
}

interface KnownExceptionBody {
  message?: string;
  details?: ErrorDetail[];
}

const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
};

const FALLBACK_MESSAGE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthenticated',
  [HttpStatus.NOT_FOUND]: 'Resource not found',
  [HttpStatus.CONFLICT]: 'Conflict',
};

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = randomUUID();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const { message, details } = this.readBody(body, status);
      response.status(status).json({
        status: false,
        message,
        data: {
          code: CODE_BY_STATUS[status] ?? 'ERROR',
          ...(status === HttpStatus.BAD_REQUEST && details ? { details } : {}),
          requestId,
        },
      });
      return;
    }

    // Nest's default behaviour otherwise leaks the constraint name and table
    // in the response (CLAUDE.md §6) — must be explicitly caught here.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(exception);
      const isUniqueViolation = exception.code === 'P2002';
      const status = isUniqueViolation
        ? HttpStatus.CONFLICT
        : HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        status: false,
        message: isUniqueViolation
          ? 'Resource already exists'
          : INTERNAL_ERROR_MESSAGE,
        data: {
          code: isUniqueViolation ? 'CONFLICT' : 'INTERNAL_ERROR',
          requestId,
        },
      });
      return;
    }

    // Unhandled: stack traces logged, never serialised (API_DESIGN.md §6).
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: INTERNAL_ERROR_MESSAGE,
      data: {
        code: 'INTERNAL_ERROR',
        requestId,
      },
    });
  }

  private readBody(
    body: string | object,
    status: number,
  ): { message: string; details?: ErrorDetail[] } {
    if (typeof body === 'string') {
      return { message: body || FALLBACK_MESSAGE_BY_STATUS[status] || 'Error' };
    }
    const { message, details } = body as KnownExceptionBody;
    return {
      message: message ?? FALLBACK_MESSAGE_BY_STATUS[status] ?? 'Error',
      details,
    };
  }
}
