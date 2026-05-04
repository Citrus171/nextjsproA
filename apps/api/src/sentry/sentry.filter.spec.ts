import {
  ArgumentsHost,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { SentryFilter } from "./sentry.filter";

jest.mock("@sentry/nestjs", () => ({
  captureException: jest.fn(),
}));

function makeHost(): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe("SentryFilter", () => {
  let filter: SentryFilter;
  const captureException = Sentry.captureException as jest.Mock;

  beforeEach(() => {
    filter = new SentryFilter();
    captureException.mockClear();
  });

  it("5xx エラーの時、Sentry.captureException が呼ばれること", () => {
    const error = new InternalServerErrorException("サーバーエラー");
    filter.catch(error, makeHost());
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("4xx HttpException の時、Sentry.captureException が呼ばれないこと", () => {
    const error = new HttpException("見つかりません", 404);
    filter.catch(error, makeHost());
    expect(captureException).not.toHaveBeenCalled();
  });

  it("HttpException 以外の Error の時、Sentry.captureException が呼ばれること", () => {
    const error = new Error("予期しないエラー");
    filter.catch(error, makeHost());
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
