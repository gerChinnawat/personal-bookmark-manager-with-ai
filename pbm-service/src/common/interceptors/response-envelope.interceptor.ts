import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

const MESSAGE_BY_METHOD: Record<string, string> = {
  GET: 'OK',
  POST: 'Created',
  PUT: 'Updated',
  PATCH: 'Updated',
  DELETE: 'Deleted',
};

// Wraps every success body in the {status, message, data} envelope
// (API_DESIGN.md §2/§6). A 204 has no body by HTTP spec, so it is left
// untouched rather than forced into the envelope.
@Injectable()
export class ResponseEnvelopeInterceptor
  implements NestInterceptor<unknown, ApiResponse<unknown> | unknown>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown> | unknown> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<{ method: string }>();

    return next.handle().pipe(
      map((data) => {
        if (response.statusCode === HttpStatus.NO_CONTENT) return data;
        return {
          status: true,
          message: MESSAGE_BY_METHOD[request.method] ?? 'OK',
          data,
        };
      }),
    );
  }
}
