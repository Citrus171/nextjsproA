import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerException } from "@nestjs/throttler";

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === "test") return true;
    return super.canActivate(context);
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      "リクエスト数が制限を超えました。しばらく待ってから再試行してください。"
    );
  }
}
