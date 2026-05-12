import { HealthCheckError } from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./prisma-health.indicator";

const mockPrisma = {
  $queryRaw: jest.fn(),
};

describe("PrismaHealthIndicator", () => {
  let indicator: PrismaHealthIndicator;

  beforeEach(() => {
    indicator = new PrismaHealthIndicator(mockPrisma as never);
    jest.clearAllMocks();
  });

  it("DB が正常なとき、status:up を返すこと", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const result = await indicator.pingCheck("database");

    expect(result.database.status).toBe("up");
  });

  it("DB が異常なとき、HealthCheckError をスローすること", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(
      new Error("connection refused: host=db port=5432")
    );

    await expect(indicator.pingCheck("database")).rejects.toBeInstanceOf(
      HealthCheckError
    );
  });

  it("DB エラー時のステータスに message を含まないこと", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(
      new Error("connection refused: host=db port=5432")
    );

    try {
      await indicator.pingCheck("database");
      fail("HealthCheckError がスローされるべき");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(HealthCheckError);
      const err = e as HealthCheckError;
      expect(err.causes).not.toHaveProperty("database.message");
    }
  });
});
