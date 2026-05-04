import {
  ArgumentsHost,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";
import { SentryFilter } from "./sentry.filter";

jest.mock("@sentry/nestjs", () => ({
  captureException: jest.fn(),
}));

const mockHost = {} as ArgumentsHost;

describe("SentryFilter", () => {
  let filter: SentryFilter;
  let superCatchSpy: jest.SpyInstance;
  const captureException = Sentry.captureException as jest.Mock;

  beforeEach(() => {
    filter = new SentryFilter();
    superCatchSpy = jest
      .spyOn(BaseExceptionFilter.prototype, "catch")
      .mockImplementation(() => undefined);
    captureException.mockClear();
  });

  afterEach(() => {
    superCatchSpy.mockRestore();
  });

  it("5xx エラーの時、Sentry.captureException が呼ばれること", () => {
    const error = new InternalServerErrorException("サーバーエラー");
    filter.catch(error, mockHost);
    expect(captureException).toHaveBeenCalledWith(error);
    expect(superCatchSpy).toHaveBeenCalledWith(error, mockHost);
  });

  it("4xx HttpException の時、Sentry.captureException が呼ばれないこと", () => {
    const error = new HttpException("見つかりません", 404);
    filter.catch(error, mockHost);
    expect(captureException).not.toHaveBeenCalled();
    expect(superCatchSpy).toHaveBeenCalledWith(error, mockHost);
  });

  it("HttpException 以外の Error の時、Sentry.captureException が呼ばれること", () => {
    const error = new Error("予期しないエラー");
    filter.catch(error, mockHost);
    expect(captureException).toHaveBeenCalledWith(error);
    expect(superCatchSpy).toHaveBeenCalledWith(error, mockHost);
  });
});
