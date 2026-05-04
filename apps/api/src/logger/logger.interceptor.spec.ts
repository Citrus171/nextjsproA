import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { LoggerInterceptor } from "./logger.interceptor";
import { Logger } from "nestjs-pino";

const makeMockContext = (
  overrides: Partial<{ method: string; url: string }> = {}
): ExecutionContext => {
  const req = {
    method: overrides.method ?? "GET",
    url: overrides.url ?? "/api/posts",
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;
};

const makeCallHandler = (obs: any): CallHandler => ({
  handle: () => obs,
});

describe("LoggerInterceptor", () => {
  let interceptor: LoggerInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    const logger = { log: jest.fn(), error: jest.fn() } as unknown as Logger;
    interceptor = new LoggerInterceptor(logger);
    logSpy = jest.spyOn(logger, "log");
    errorSpy = jest.spyOn(logger, "error");
  });

  it("正常レスポンスの時、method・url・statusCode・durationをログ出力すること", (done) => {
    const ctx = makeMockContext({ method: "GET", url: "/api/posts" });
    const handler = makeCallHandler(of({ data: "ok" }));

    interceptor.intercept(ctx, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const [msg, obj] = logSpy.mock.calls[0];
        expect(msg).toContain("GET /api/posts");
        expect(obj).toMatchObject({
          method: "GET",
          url: "/api/posts",
          statusCode: 200,
        });
        expect(typeof obj.duration).toBe("number");
        done();
      },
    });
  });

  it("例外発生の時、errorログを出力すること", (done) => {
    const ctx = makeMockContext({ method: "POST", url: "/api/auth/login" });
    const err = new Error("認証失敗");
    const handler = makeCallHandler(throwError(() => err));

    interceptor.intercept(ctx, handler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [msg, obj] = errorSpy.mock.calls[0];
        expect(msg).toContain("POST /api/auth/login");
        expect(obj).toMatchObject({
          method: "POST",
          url: "/api/auth/login",
          error: "認証失敗",
        });
        done();
      },
    });
  });
});
