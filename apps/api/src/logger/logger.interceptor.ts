import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { Logger } from "nestjs-pino";

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
    }>();
    const res = context.switchToHttp().getResponse<{ statusCode: number }>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url}`, {
          method,
          url,
          statusCode: res.statusCode,
          duration,
        });
      }),
      catchError((err: Error) => {
        const duration = Date.now() - start;
        this.logger.error(`${method} ${url}`, {
          method,
          url,
          error: err.message,
          duration,
        });
        return throwError(() => err);
      })
    );
  }
}
