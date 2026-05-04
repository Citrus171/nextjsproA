import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  DiskHealthIndicator,
} from "@nestjs/terminus";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { UploadsHealthIndicator } from "./uploads-health.indicator";

@ApiTags("health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly uploads: UploadsHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  @ApiResponse({ status: 200, description: "サービス正常" })
  @ApiResponse({ status: 503, description: "サービス異常" })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck("database"),
      () =>
        this.disk.checkStorage("disk", {
          path: "/",
          thresholdPercent: 0.8,
        }),
      () => this.uploads.isHealthy("uploads"),
    ]);
  }
}
