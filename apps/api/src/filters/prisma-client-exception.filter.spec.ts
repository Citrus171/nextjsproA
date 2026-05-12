import {
  ArgumentsHost,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaClientExceptionFilter } from "./prisma-client-exception.filter";

describe("PrismaClientExceptionFilter", () => {
  let filter: PrismaClientExceptionFilter;

  beforeEach(() => {
    filter = new PrismaClientExceptionFilter();
  });

  const makeHost = (): ArgumentsHost =>
    ({
      switchToHttp: jest.fn(),
    }) as unknown as ArgumentsHost;

  describe("P2025（レコード不在）", () => {
    it("code=E_RESOURCE_NOT_FOUND の NotFoundException に変換すること", () => {
      const err = new Prisma.PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        { code: "P2025", clientVersion: "5.0.0" }
      );
      const host = makeHost();

      try {
        filter.catch(err, host);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NotFoundException);
        const response = (e as NotFoundException).getResponse();
        expect(response).toMatchObject({
          code: "E_RESOURCE_NOT_FOUND",
          message: "リソースが見つかりません",
        });
      }
    });
  });

  describe("P2002（一意制約違反）", () => {
    it("code=E_RESOURCE_DUPLICATE の ConflictException に変換すること", () => {
      const err = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`email`)",
        { code: "P2002", clientVersion: "5.0.0" }
      );
      const host = makeHost();

      try {
        filter.catch(err, host);
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse();
        expect(response).toMatchObject({
          code: "E_RESOURCE_DUPLICATE",
          message: "リソースが重複しています",
        });
      }
    });
  });

  describe("不明なPrismaエラーコード", () => {
    it("そのまま再スローすること", () => {
      const err = new Prisma.PrismaClientKnownRequestError(
        "Some other prisma error",
        { code: "P2014", clientVersion: "5.0.0" }
      );
      const host = makeHost();

      expect(() => filter.catch(err, host)).toThrow(err);
    });
  });
});
