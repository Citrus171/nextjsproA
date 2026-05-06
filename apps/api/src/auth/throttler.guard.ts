import { Injectable, ExecutionContext } from "@nestjs/common";
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerRequest,
} from "@nestjs/throttler";

const THROTTLER_LIMIT = "THROTTLER:LIMIT";

// login/register throttlers apply only to routes with explicit @Throttle({ login/register: ... })
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
      const routeThrottlers =
        Reflect.getMetadata(THROTTLER_LIMIT, context.getHandler()) ||
        Reflect.getMetadata(THROTTLER_LIMIT, context.getClass());

      if (!routeThrottlers?.[throttler.name]) {
        return true;
      }
    }

    return super.handleRequest(requestProps);
  }
}
