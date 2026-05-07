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
    it("NotFoundException に変換すること", () => {
      const err = new Prisma.PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        { code: "P2025", clientVersion: "5.0.0" }
      );
      const host = makeHost();

      expect(() => filter.catch(err, host)).toThrow(NotFoundException);
    });
  });

  describe("P2002（一意制約違反）", () => {
    it("ConflictException に変換すること", () => {
      const err = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`email`)",
        { code: "P2002", clientVersion: "5.0.0" }
      );
      const host = makeHost();

      expect(() => filter.catch(err, host)).toThrow(ConflictException);
    });
  });

  describe("Prisma 以外のエラー", () => {
    it("そのまま再スローすること", () => {
      const err = new Error("予期しないエラー");
      const host = makeHost();

      expect(() => filter.catch(err, host)).toThrow(err);
    });
  });
});
