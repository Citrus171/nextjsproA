import { ThrottlerException } from "@nestjs/throttler";
import { AppThrottlerGuard } from "./throttler.guard";

describe("AppThrottlerGuard", () => {
  let guard: AppThrottlerGuard;

  beforeEach(() => {
    guard = new AppThrottlerGuard(
      { throttlers: [] } as any,
      {} as never,
      {} as never
    );
  });

  it("制限超過時に日本語メッセージ付き ThrottlerException をスローすること", async () => {
    try {
      await (
        guard as unknown as { throwThrottlingException: () => Promise<void> }
      ).throwThrottlingException();
      fail("例外がスローされるべき");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(ThrottlerException);
      expect((e as ThrottlerException).message).toBe(
        "リクエスト数が制限を超えました。しばらく待ってから再試行してください。"
      );
    }
  });
});
