import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerException } from "@nestjs/throttler";

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      "リクエスト数が制限を超えました。しばらく待ってから再試行してください。"
    );
  }
}
