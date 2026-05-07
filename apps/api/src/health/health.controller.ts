import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { UploadsHealthIndicator } from "./uploads-health.indicator";

const HEAP_THRESHOLD =
  process.env.NODE_ENV === "test" ? 1024 * 1024 * 1024 : 256 * 1024 * 1024;

@ApiTags("health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly uploads: UploadsHealthIndicator,
    private readonly memory: MemoryHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  @ApiResponse({ status: 200, description: "サービス正常" })
  @ApiResponse({ status: 503, description: "サービス異常" })
  async check() {
    const result = await this.health.check([
      () => this.prismaHealth.pingCheck("database"),
      () =>
        this.disk.checkStorage("disk", {
          path: process.cwd(),
          thresholdPercent: 0.8,
        }),
      () => this.uploads.isHealthy("uploads"),
      () => this.memory.checkHeap("memory_heap", HEAP_THRESHOLD),
    ]);
    return { ...result, uptime: process.uptime() };
  }
}
