import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { Response } from "express";

interface ErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: Array<Record<string, unknown>>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : 500;

    const is4xx = isHttpException && status < 500;
    if (!is4xx) {
      Sentry.captureException(exception);
    }

    const body = this.buildBody(exception, status);
    response.status(status).json(body);
  }

  private buildBody(exception: unknown, status: number): ErrorEnvelope {
    if (exception instanceof HttpException) {
      return this.buildHttpExceptionBody(exception, status);
    }

    return {
      statusCode: status,
      code: "E_UNKNOWN",
      message: "サーバー内部エラーが発生しました",
    };
  }

  private buildHttpExceptionBody(
    exception: HttpException,
    status: number
  ): ErrorEnvelope {
    const exResponse = exception.getResponse();

    if (typeof exResponse === "string") {
      const code = status === 429 ? "E_RATE_LIMIT" : "E_UNKNOWN";
      return { statusCode: status, code, message: exResponse };
    }

    if (typeof exResponse === "object" && exResponse !== null) {
      return this.buildObjectBody(
        exResponse as Record<string, unknown>,
        status
      );
    }

    return {
      statusCode: status,
      code: "E_UNKNOWN",
      message: "サーバーエラーが発生しました",
    };
  }

  private buildObjectBody(
    resp: Record<string, unknown>,
    status: number
  ): ErrorEnvelope {
    if (Array.isArray(resp.message)) {
      return this.buildValidationBody(resp.message as string[], status);
    }

    const code = typeof resp.code === "string" ? resp.code : "E_UNKNOWN";
    const message = this.extractMessage(resp);
    const body: ErrorEnvelope = { statusCode: status, code, message };

    if (resp.details) {
      body.details = resp.details as Array<Record<string, unknown>>;
    }

    return body;
  }

  private buildValidationBody(
    messages: string[],
    status: number
  ): ErrorEnvelope {
    return {
      statusCode: status,
      code: "E_VALIDATION",
      message: "入力値が不正です",
      details: messages.map((msg) => ({ message: msg })),
    };
  }

  private extractMessage(resp: Record<string, unknown>): string {
    if (typeof resp.message === "string") {
      return resp.message;
    }
    if (typeof resp.error === "string") {
      return resp.error;
    }
    return "サーバーエラーが発生しました";
  }
}
