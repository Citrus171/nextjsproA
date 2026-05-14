import { MapController } from "./map.controller";

const THROTTLER_SKIP = "THROTTLER:SKIP";
const THROTTLER_LIMIT = "THROTTLER:LIMIT";
const THROTTLER_TTL = "THROTTLER:TTL";

describe("MapController", () => {
  describe("getMarkers スロットル設定", () => {
    const handler = MapController.prototype.getMarkers;

    it("@SkipThrottle が public に設定されていないこと", () => {
      const skip = Reflect.getMetadata(THROTTLER_SKIP + "public", handler);
      expect(skip).not.toBe(true);
    });

    it("@SkipThrottle が default に設定されていないこと", () => {
      const skip = Reflect.getMetadata(THROTTLER_SKIP + "default", handler);
      expect(skip).not.toBe(true);
    });

    it("public スロットルの limit が 600 であること", () => {
      const limit = Reflect.getMetadata(THROTTLER_LIMIT + "public", handler);
      expect(limit).toBe(600);
    });

    it("public スロットルの ttl が 60000 であること", () => {
      const ttl = Reflect.getMetadata(THROTTLER_TTL + "public", handler);
      expect(ttl).toBe(60000);
    });
  });
});
