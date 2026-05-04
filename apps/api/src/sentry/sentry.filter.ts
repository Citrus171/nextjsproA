import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Catch()
export class SentryFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const is4xx =
      exception instanceof HttpException && exception.getStatus() < 500;

    if (!is4xx) {
      Sentry.captureException(exception);
    }

    const res = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException
        ? exception.message
        : "内部サーバーエラー";

    res.status(status).json({ statusCode: status, message });
  }
}
