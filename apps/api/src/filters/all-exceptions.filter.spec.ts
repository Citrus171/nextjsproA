import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { AllExceptionsFilter } from "./all-exceptions.filter";

jest.mock("@sentry/nestjs", () => ({
  captureException: jest.fn(),
}));

function makeHost(): ArgumentsHost {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, json };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
}

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  const captureException = Sentry.captureException as jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    captureException.mockClear();
  });

  describe("HttpException（文字列メッセージ）の時", () => {
    it("statusCode / code / message を含むエンベロープを返すこと", () => {
      const exception = new NotFoundException("投稿が見つかりません");
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 404,
        code: "E_UNKNOWN",
        message: "投稿が見つかりません",
      });
    });

    it("4xx の時 Sentry.captureException が呼ばれないこと", () => {
      const exception = new NotFoundException("投稿が見つかりません");
      const host = makeHost();

      filter.catch(exception, host);

      expect(captureException).not.toHaveBeenCalled();
    });

    it("5xx の時 Sentry.captureException が呼ばれること", () => {
      const exception = new InternalServerErrorException("サーバーエラー");
      const host = makeHost();

      filter.catch(exception, host);

      expect(captureException).toHaveBeenCalledWith(exception);
    });

    it("429 の時 E_RATE_LIMIT コードが付与されること", () => {
      const exception = new HttpException(
        "リクエスト数が制限を超えました",
        429
      );
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 429,
        code: "E_RATE_LIMIT",
        message: "リクエスト数が制限を超えました",
      });
    });
  });

  describe("HttpException（code 付きオブジェクト）の時", () => {
    it("指定された code をそのまま返すこと", () => {
      const exception = new BadRequestException({
        code: "E_POST_PLAN_LIMIT",
        message: "無料プランの月間投稿数上限に達しています",
      });
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 400,
        code: "E_POST_PLAN_LIMIT",
        message: "無料プランの月間投稿数上限に達しています",
      });
    });
  });

  describe("バリデーションエラー（message が配列）の時", () => {
    it("E_VALIDATION コードと details を返すこと", () => {
      const exception = new BadRequestException([
        "タイトルは必須です",
        "年齢は数値で入力してください",
      ]);
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 400,
        code: "E_VALIDATION",
        message: "入力値が不正です",
        details: [
          { message: "タイトルは必須です" },
          { message: "年齢は数値で入力してください" },
        ],
      });
    });
  });

  describe("HttpException 以外の例外の時", () => {
    it("500 ステータスと E_UNKNOWN を返し、Sentry に送信すること", () => {
      const exception = new Error("予期しないエラー");
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 500,
        code: "E_UNKNOWN",
        message: "サーバー内部エラーが発生しました",
      });
      expect(captureException).toHaveBeenCalledWith(exception);
    });
  });

  describe("details 付き例外の時", () => {
    it("details フィールドを含めて返すこと", () => {
      const exception = new BadRequestException({
        code: "E_SOME_ERROR",
        message: "エラーが発生しました",
        details: [{ field: "email", message: "メールアドレスが無効です" }],
      });
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 400,
        code: "E_SOME_ERROR",
        message: "エラーが発生しました",
        details: [{ field: "email", message: "メールアドレスが無効です" }],
      });
    });
  });

  describe("message フィールドが文字列でない場合のフォールバック", () => {
    it("error フィールドを message として使うこと", () => {
      const exception = new HttpException(
        { error: "エラーメッセージです" },
        400
      );
      const host = makeHost();

      filter.catch(exception, host);

      const res = host.switchToHttp().getResponse();
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 400,
        code: "E_UNKNOWN",
        message: "エラーメッセージです",
      });
    });
  });
});
