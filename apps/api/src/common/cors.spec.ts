import { isOriginAllowed } from "./cors";

const allowedOrigins = ["https://finder.miyaoo.com"];

describe("isOriginAllowed", () => {
  describe("本番環境 (isDev=false)", () => {
    it("許可オリジンからのリクエストを許可すること", () => {
      expect(
        isOriginAllowed("https://finder.miyaoo.com", false, allowedOrigins)
      ).toBe(true);
    });

    it("origin なしのリクエストを許可すること（サーバー間通信のため）", () => {
      expect(isOriginAllowed(undefined, false, allowedOrigins)).toBe(true);
    });

    it("localhost からのリクエストを拒否すること", () => {
      expect(
        isOriginAllowed("http://localhost:5173", false, allowedOrigins)
      ).toBe(false);
    });

    it("未知のオリジンを拒否すること", () => {
      expect(isOriginAllowed("https://evil.com", false, allowedOrigins)).toBe(
        false
      );
    });
  });

  describe("開発環境 (isDev=true)", () => {
    it("origin なしのリクエストを許可すること", () => {
      expect(isOriginAllowed(undefined, true, allowedOrigins)).toBe(true);
    });

    it("localhost の任意ポートを許可すること", () => {
      expect(
        isOriginAllowed("http://localhost:5173", true, allowedOrigins)
      ).toBe(true);
      expect(
        isOriginAllowed("http://localhost:5174", true, allowedOrigins)
      ).toBe(true);
      expect(isOriginAllowed("http://localhost", true, allowedOrigins)).toBe(
        true
      );
    });

    it("許可オリジンを許可すること", () => {
      expect(
        isOriginAllowed("https://finder.miyaoo.com", true, allowedOrigins)
      ).toBe(true);
    });

    it("未知の非 localhost オリジンを拒否すること", () => {
      expect(isOriginAllowed("https://evil.com", true, allowedOrigins)).toBe(
        false
      );
    });
  });
});
