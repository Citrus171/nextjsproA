import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const is4xx =
      exception instanceof HttpException && exception.getStatus() < 500;

    if (!is4xx) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
