import { Injectable } from "@nestjs/common";
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerRequest,
} from "@nestjs/throttler";

// v5では @Throttle({ login: {} }) が "THROTTLER:LIMITlogin" キーにメタデータを保存する
const THROTTLER_LIMIT_PREFIX = "THROTTLER:LIMIT";

// login/register は @Throttle で明示されたルートのみに適用する
const OPT_IN_THROTTLERS = new Set(["login", "register"]);

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      "リクエスト数が制限を超えました。しばらく待ってから再試行してください。"
    );
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest
  ): Promise<boolean> {
    const { context, throttler } = requestProps;

    if (OPT_IN_THROTTLERS.has(throttler.name)) {
      const handler = context.getHandler();
      const classRef = context.getClass();
      const metaKey = THROTTLER_LIMIT_PREFIX + throttler.name;

      const hasExplicit =
        Reflect.hasMetadata(metaKey, handler) ||
        Reflect.hasMetadata(metaKey, classRef);

      if (!hasExplicit) {
        return true;
      }
    }

    return super.handleRequest(requestProps);
  }
}
