import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService, HealthCheckResult } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { UploadsHealthIndicator } from "./uploads-health.indicator";
import { DiskHealthIndicator } from "@nestjs/terminus";

const makeHealthyResult = (): HealthCheckResult => ({
  status: "ok",
  info: {
    database: { status: "up" },
    disk: { status: "up" },
    uploads: { status: "up" },
  },
  error: {},
  details: {
    database: { status: "up" },
    disk: { status: "up" },
    uploads: { status: "up" },
  },
});

const makeUnhealthyResult = (): HealthCheckResult => ({
  status: "error",
  info: {},
  error: { database: { status: "down", message: "DB接続失敗" } },
  details: { database: { status: "down", message: "DB接続失敗" } },
});

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };
    const mockPrismaHealth = { pingCheck: jest.fn() };
    const mockDisk = { checkStorage: jest.fn() };
    const mockUploads = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealth },
        { provide: DiskHealthIndicator, useValue: mockDisk },
        { provide: UploadsHealthIndicator, useValue: mockUploads },
      ],
    }).compile();

    controller = module.get(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  describe("check()", () => {
    it("全チェックが正常なとき、status:okを返すこと", async () => {
      const result = makeHealthyResult();
      healthCheckService.check.mockResolvedValue(result);

      const res = await controller.check();

      expect(res.status).toBe("ok");
      expect(res.info?.database?.status).toBe("up");
      expect(res.info?.disk?.status).toBe("up");
      expect(res.info?.uploads?.status).toBe("up");
    });

    it("DBが異常なとき、status:errorを返すこと", async () => {
      const result = makeUnhealthyResult();
      healthCheckService.check.mockResolvedValue(result);

      const res = await controller.check();

      expect(res.status).toBe("error");
      expect(res.error?.database?.status).toBe("down");
    });

    it("check()はHealthCheckService.check()を呼び出すこと", async () => {
      healthCheckService.check.mockResolvedValue(makeHealthyResult());

      await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    });
  });
});
