import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class UploadsHealthIndicator extends HealthIndicator {
  private readonly uploadsPath: string;

  constructor() {
    super();
    this.uploadsPath = path.join(process.cwd(), "uploads");
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const tmpFile = path.join(this.uploadsPath, `.health-${Date.now()}`);
    try {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
      fs.writeFileSync(tmpFile, "ok");
      fs.unlinkSync(tmpFile);
      return this.getStatus(key, true);
    } catch (e: unknown) {
      throw new HealthCheckError(
        "uploadsディレクトリ書き込みチェック失敗",
        this.getStatus(key, false, { message: (e as Error).message })
      );
    }
  }
}
