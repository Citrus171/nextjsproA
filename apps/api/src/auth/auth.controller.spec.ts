import { ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import {
  IIdentityService,
  refreshTokenCookieOptions,
} from "../identity/identity.service";

const mockIdentity = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
} as unknown as jest.Mocked<IIdentityService>;

function mockConfig(env: string, cookieSecure?: string) {
  return {
    get: jest.fn((key: string) => {
      if (key === "NODE_ENV") return env;
      if (key === "COOKIE_SECURE") return cookieSecure;
      return undefined;
    }),
    getOrThrow: jest.fn(),
  } as unknown as ConfigService;
}

describe("AuthController", () => {
  let controller: AuthController;

  describe("logout", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("clearCookie が refreshTokenCookieOptions と同じ属性で呼ばれること（非production）", async () => {
      controller = new AuthController(mockIdentity, mockConfig("test"));
      const res = {
        clearCookie: jest.fn(),
      } as any;
      const req = {
        cookies: { refreshToken: "some-token" },
      } as any;

      await controller.logout(req, res);

      const expected = refreshTokenCookieOptions(false);
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expected);
    });

    it("clearCookie が refreshTokenCookieOptions と同じ属性で呼ばれること（production）", async () => {
      controller = new AuthController(mockIdentity, mockConfig("production"));
      const res = {
        clearCookie: jest.fn(),
      } as any;
      const req = {
        cookies: { refreshToken: "some-token" },
      } as any;

      await controller.logout(req, res);

      const expected = refreshTokenCookieOptions(true);
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expected);
    });

    it("COOKIE_SECURE=false なら production でも secure=false の属性で clearCookie が呼ばれること", async () => {
      controller = new AuthController(
        mockIdentity,
        mockConfig("production", "false")
      );
      const res = {
        clearCookie: jest.fn(),
      } as any;
      const req = {
        cookies: { refreshToken: "some-token" },
      } as any;

      await controller.logout(req, res);

      const expected = refreshTokenCookieOptions(false);
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expected);
    });

    it("Cookie がなければ clearCookie は属性付きで呼ばれ、logout は呼ばれないこと", async () => {
      controller = new AuthController(mockIdentity, mockConfig("test"));
      const res = {
        clearCookie: jest.fn(),
      } as any;
      const req = {
        cookies: {},
      } as any;

      await controller.logout(req, res);

      expect(mockIdentity.logout).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        refreshTokenCookieOptions(false)
      );
    });
  });
});
