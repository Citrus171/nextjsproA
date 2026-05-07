import { Test, TestingModule } from "@nestjs/testing";
import {
  HealthCheckService,
  HealthCheckResult,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
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
    memory_heap: { status: "up" },
  },
  error: {},
  details: {
    database: { status: "up" },
    disk: { status: "up" },
    uploads: { status: "up" },
    memory_heap: { status: "up" },
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
    const mockMemory = { checkHeap: jest.fn() };

    jest.spyOn(process, "uptime").mockReturnValue(12345.678);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealth },
        { provide: DiskHealthIndicator, useValue: mockDisk },
        { provide: UploadsHealthIndicator, useValue: mockUploads },
        { provide: MemoryHealthIndicator, useValue: mockMemory },
      ],
    }).compile();

    controller = module.get(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      expect(res.info?.memory_heap?.status).toBe("up");
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

    it("レスポンスにuptime（秒）が含まれること", async () => {
      healthCheckService.check.mockResolvedValue(makeHealthyResult());

      const res = await controller.check();

      expect(typeof res.uptime).toBe("number");
      expect(res.uptime).toBeGreaterThan(0);
    });
  });
});
