import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { Logger } from "nestjs-pino";
import {
  IdentityService,
  refreshTokenCookieOptions,
  resolveCookieSecure,
  REFRESH_TOKEN_MAX_AGE_MS,
} from "./identity.service";
import { CryptoService } from "./crypto.service";
import { PrismaService } from "../prisma.service";

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("access-token-jwt"),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === "NODE_ENV") return "test";
    if (key === "JWT_SECRET") return "jwt-secret";
    return undefined;
  }),
  getOrThrow: jest.fn((key: string) => {
    if (key === "NODE_ENV") return "test";
    if (key === "JWT_SECRET") return "jwt-secret";
    throw new Error(`Config key ${key} not found`);
  }),
} as unknown as ConfigService;

const mockCrypto = {
  normalizeEmail: jest.fn((e: string) => e.toLowerCase().trim()),
  encryptEmail: jest.fn().mockReturnValue("encrypted-email"),
  decryptEmail: jest.fn().mockReturnValue("user@example.com"),
  hmacEmail: jest.fn().mockReturnValue("hmac-hash"),
  sha256Hex: jest.fn().mockReturnValue("token-hash"),
  generateSecureToken: jest.fn().mockReturnValue("a".repeat(96)),
};

const mockLogger: jest.Mocked<Logger> = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
} as unknown as jest.Mocked<Logger>;

async function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    emailEncrypted: "encrypted-email",
    emailHash: "hmac-hash",
    password: await bcrypt.hash("password123", 10),
    nickname: "Alice",
    role: "user",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("IdentityService", () => {
  let service: IdentityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IdentityService(
      mockPrisma as unknown as PrismaService,
      mockJwt as unknown as JwtService,
      mockConfig,
      mockCrypto as unknown as CryptoService,
      mockLogger
    );
  });

  describe("login", () => {
    it("正しいメールとパスワードでAuthResultを返すこと", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.login("user@example.com", "password123");

      expect(result.accessToken).toBe("access-token-jwt");
      expect(result.setCookies).toHaveLength(1);
      expect(result.setCookies[0].name).toBe("refreshToken");
      expect(result.setCookies[0].value).toBe("a".repeat(96));
      expect(result.setCookies[0].options.httpOnly).toBe(true);
      expect(result.setCookies[0].options.sameSite).toBe("lax");
      expect(result.setCookies[0].options.maxAge).toBe(
        60 * 60 * 24 * 30 * 1000
      );
    });

    it("ログイン成功時に auth.login.success イベントをログ出力すること", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      await service.login("user@example.com", "password123");

      expect(mockLogger.log).toHaveBeenCalledWith("auth.login.success", {
        event: "auth.login.success",
        userId: "user-1",
      });
    });

    it("DBにはtokenHashが保存され、平文トークンは保存されないこと", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.login("user@example.com", "password123");
      const plainToken = result.setCookies[0].value;

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).toBe("token-hash");
      expect(createCall.data).not.toHaveProperty("token");
      expect(createCall.data.tokenHash).not.toBe(plainToken);
    });

    it("パスワード不一致でUnauthorizedExceptionを投げること", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      try {
        await service.login("user@example.com", "wrongpassword");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_CREDENTIALS",
          message: expect.any(String),
        });
      }
    });

    it("パスワード不一致時に auth.login.failure イベントをログ出力すること", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      try {
        await service.login("user@example.com", "wrongpassword");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_CREDENTIALS",
          message: expect.any(String),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith("auth.login.failure", {
        event: "auth.login.failure",
        reason: "password mismatch",
      });
    });

    it("存在しないメールアドレスでUnauthorizedExceptionを投げること", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      try {
        await service.login("no@example.com", "password");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_CREDENTIALS",
          message: expect.any(String),
        });
      }
    });

    it("メールアドレス未登録時に auth.login.failure イベントをログ出力すること", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      try {
        await service.login("no@example.com", "password");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_CREDENTIALS",
          message: expect.any(String),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith("auth.login.failure", {
        event: "auth.login.failure",
        reason: "email not found",
      });
    });

    it("HMACのみで検索し、SHA256フォールバックを行わないこと", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      await service.login("user@example.com", "password123");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it("ログイン成功時、JWTペイロードにnicknameが含まれること", async () => {
      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      await service.login("user@example.com", "password123");

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: "Alice" })
      );
    });

    it("production環境ではCookieのsecureとsameSiteが適切に設定されること", async () => {
      const prodConfig = {
        get: jest.fn((key: string) => {
          if (key === "NODE_ENV") return "production";
          if (key === "JWT_SECRET") return "jwt-secret";
          return undefined;
        }),
        getOrThrow: jest.fn((key: string) => {
          if (key === "NODE_ENV") return "production";
          if (key === "JWT_SECRET") return "jwt-secret";
          throw new Error(`Config key ${key} not found`);
        }),
      } as unknown as ConfigService;
      const prodService = new IdentityService(
        mockPrisma as any,
        mockJwt as unknown as JwtService,
        prodConfig,
        mockCrypto as unknown as CryptoService,
        mockLogger
      );

      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      const result = await prodService.login("user@example.com", "password123");

      expect(result.setCookies[0].options.secure).toBe(true);
      expect(result.setCookies[0].options.sameSite).toBe("none");
      expect(result.setCookies[0].options.maxAge).toBe(
        60 * 60 * 24 * 30 * 1000
      );
    });
  });

  describe("refresh", () => {
    it("有効なトークンで新しいAuthResultを返すこと", async () => {
      const ts = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: ts,
        user: { emailEncrypted: "enc-email", role: "user", nickname: "Alice" },
      });
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.refresh("old-refresh-token");

      expect(result.accessToken).toBe("access-token-jwt");
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { tokenHash: "token-hash" },
      });
    });

    it("ローテーション: 新しいトークンのハッシュがDBに保存されること", async () => {
      const ts = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: ts,
        user: { emailEncrypted: "enc-email", role: "user", nickname: "Alice" },
      });
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.refresh("old-refresh-token");
      const newPlainToken = result.setCookies[0].value;

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).toBe("token-hash");
      expect(createCall.data).not.toHaveProperty("token");
      expect(createCall.data.tokenHash).not.toBe(newPlainToken);
    });

    it("リフレッシュ成功時に auth.refresh.success イベントをログ出力すること", async () => {
      const ts = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: ts,
        user: { emailEncrypted: "enc-email", role: "user", nickname: "Alice" },
      });
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      await service.refresh("old-refresh-token");

      expect(mockLogger.log).toHaveBeenCalledWith("auth.refresh.success", {
        event: "auth.refresh.success",
        userId: "user-1",
      });
    });

    it("トークンが存在しない場合はUnauthorizedExceptionを投げること", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);

      try {
        await service.refresh("nonexistent");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_REFRESH_TOKEN",
          message: expect.any(String),
        });
      }
    });

    it("期限切れトークンはUnauthorizedExceptionを投げること", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1000),
      });

      try {
        await service.refresh("old-token");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_REFRESH_TOKEN",
          message: expect.any(String),
        });
      }
    });

    it("再利用検知: delete失敗時にUnauthorizedExceptionを投げること", async () => {
      const ts = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: ts,
        user: { emailEncrypted: "enc-email", role: "user", nickname: "Alice" },
      });
      mockPrisma.refreshToken.delete.mockRejectedValueOnce(
        new Error("already deleted")
      );

      try {
        await service.refresh("old-refresh-token");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_REFRESH_TOKEN",
          message: expect.any(String),
        });
      }
    });

    it("再利用検知時に auth.refresh.reuse イベントをログ出力すること", async () => {
      const ts = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: ts,
        user: { emailEncrypted: "enc-email", role: "user", nickname: "Alice" },
      });
      mockPrisma.refreshToken.delete.mockRejectedValueOnce(
        new Error("already deleted")
      );

      try {
        await service.refresh("old-refresh-token");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_INVALID_REFRESH_TOKEN",
          message: expect.any(String),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith("auth.refresh.reuse", {
        event: "auth.refresh.reuse",
        userId: "user-1",
        reason: "token already used",
      });
    });

    it("リフレッシュ成功時、JWTペイロードにnicknameが含まれること", async () => {
      const ts = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
        expiresAt: ts,
        user: { emailEncrypted: "enc-email", role: "user", nickname: "Alice" },
      });
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      await service.refresh("old-refresh-token");

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: "Alice" })
      );
    });
  });

  describe("logout", () => {
    it("リフレッシュトークンをハッシュで削除すること", async () => {
      mockPrisma.refreshToken.delete.mockResolvedValueOnce({});

      await service.logout("some-token");

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { tokenHash: "token-hash" },
      });
    });

    it("存在しないトークンでもエラーを投げないこと", async () => {
      mockPrisma.refreshToken.delete.mockRejectedValueOnce(
        new Error("not found")
      );

      await expect(service.logout("nonexistent")).resolves.toBeUndefined();
    });

    it("ログアウト成功時に auth.logout イベントをログ出力すること", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        tokenHash: "token-hash",
        userId: "user-1",
      });
      mockPrisma.refreshToken.delete.mockResolvedValueOnce({});

      await service.logout("valid-token");

      expect(mockLogger.log).toHaveBeenCalledWith("auth.logout", {
        event: "auth.logout",
        userId: "user-1",
      });
    });

    it("存在しないトークンのログアウトではログ出力しないこと", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);

      await service.logout("nonexistent");

      expect(mockLogger.log).not.toHaveBeenCalled();
    });
  });

  describe("register", () => {
    it("正常にユーザーを登録しUserDtoを返すこと", async () => {
      const createdUser = await makeUser();
      mockPrisma.user.create.mockResolvedValueOnce(createdUser);

      const result = await service.register(
        "user@example.com",
        "password123",
        "Alice"
      );

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("user@example.com");
      expect(result.nickname).toBe("Alice");
      expect(result.role).toBe("user");
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it("メールアドレス重複でConflictExceptionを投げること", async () => {
      const e = new Error("P2002") as any;
      e.code = "P2002";
      e.meta = { target: ["emailHash"] };
      mockPrisma.user.create.mockRejectedValueOnce(e);

      try {
        await service.register("dup@example.com", "pass", "nick");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_DUPLICATE_EMAIL",
          message: expect.any(String),
        });
      }
    });

    it("ニックネーム重複でConflictExceptionを投げること", async () => {
      const e = new Error("P2002") as any;
      e.code = "P2002";
      e.meta = { target: ["nickname"] };
      mockPrisma.user.create.mockRejectedValueOnce(e);

      try {
        await service.register("a@example.com", "pass", "dup");
        fail("例外がスローされるべき");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ConflictException);
        const response = (e as ConflictException).getResponse();
        expect(response).toMatchObject({
          code: "E_AUTH_DUPLICATE_NICKNAME",
          message: expect.any(String),
        });
      }
    });

    it("登録成功時に auth.register.success イベントをログ出力すること", async () => {
      const createdUser = await makeUser();
      mockPrisma.user.create.mockResolvedValueOnce(createdUser);

      await service.register("user@example.com", "password123", "Alice");

      expect(mockLogger.log).toHaveBeenCalledWith("auth.register.success", {
        event: "auth.register.success",
        userId: "user-1",
        email: "user@example.com",
      });
    });
  });

  describe("findAll", () => {
    it("全ユーザーをパスワードなしで返すこと", async () => {
      const u1 = await makeUser({ id: "u1", nickname: "A" });
      const u2 = await makeUser({ id: "u2", nickname: "B" });
      mockPrisma.user.findMany.mockResolvedValueOnce([u1, u2]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe("user@example.com");
      expect(result[0]).not.toHaveProperty("password");
      expect(result[0]).not.toHaveProperty("emailEncrypted");
    });
  });

  describe("deleteUser", () => {
    it("ユーザーを削除しUserDtoを返すこと", async () => {
      const u = await makeUser({ id: "u1", nickname: "Alice" });
      u.emailEncrypted = "enc";
      mockPrisma.user.delete.mockResolvedValueOnce(u);

      const result = await service.deleteUser("u1");

      expect(result.id).toBe("u1");
      expect(result.nickname).toBe("Alice");
    });
  });

  describe("resolveCookieSecure", () => {
    it("COOKIE_SECURE 未設定なら NODE_ENV=production で true を返すこと", () => {
      expect(resolveCookieSecure(undefined, "production")).toBe(true);
    });

    it("COOKIE_SECURE 未設定なら NODE_ENV=development で false を返すこと", () => {
      expect(resolveCookieSecure(undefined, "development")).toBe(false);
      expect(resolveCookieSecure(undefined, undefined)).toBe(false);
    });

    it("COOKIE_SECURE=true なら NODE_ENV=development でも true を返すこと", () => {
      expect(resolveCookieSecure("true", "development")).toBe(true);
    });

    it("COOKIE_SECURE=false なら NODE_ENV=production でも false を返すこと", () => {
      expect(resolveCookieSecure("false", "production")).toBe(false);
    });

    it("COOKIE_SECURE が不正値・空文字なら NODE_ENV 判定にフォールバックすること", () => {
      expect(resolveCookieSecure("1", "production")).toBe(true);
      expect(resolveCookieSecure("", "production")).toBe(true);
      expect(resolveCookieSecure("yes", "development")).toBe(false);
      expect(resolveCookieSecure("", "development")).toBe(false);
    });
  });

  describe("login（COOKIE_SECURE=false × NODE_ENV=production）", () => {
    it("production でも secure=false / sameSite=lax の Cookie を発行すること", async () => {
      const k3dConfig = {
        get: jest.fn((key: string) => {
          if (key === "NODE_ENV") return "production";
          if (key === "COOKIE_SECURE") return "false";
          if (key === "JWT_SECRET") return "jwt-secret";
          return undefined;
        }),
        getOrThrow: jest.fn(),
      } as unknown as ConfigService;
      const k3dService = new IdentityService(
        mockPrisma as any,
        mockJwt as unknown as JwtService,
        k3dConfig,
        mockCrypto as unknown as CryptoService,
        mockLogger
      );

      const user = await makeUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      const result = await k3dService.login("user@example.com", "password123");

      expect(result.setCookies[0].options.secure).toBe(false);
      expect(result.setCookies[0].options.sameSite).toBe("lax");
    });
  });

  describe("refreshTokenCookieOptions", () => {
    it("非production環境では secure=false, sameSite=lax を返すこと", () => {
      const opts = refreshTokenCookieOptions(false);

      expect(opts.secure).toBe(false);
      expect(opts.sameSite).toBe("lax");
      expect(opts.httpOnly).toBe(true);
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(REFRESH_TOKEN_MAX_AGE_MS);
      expect(opts.maxAge).toBe(60 * 60 * 24 * 30 * 1000);
    });

    it("production環境では secure=true, sameSite=none を返すこと", () => {
      const opts = refreshTokenCookieOptions(true);

      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe("none");
      expect(opts.httpOnly).toBe(true);
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(REFRESH_TOKEN_MAX_AGE_MS);
    });

    it("maxAge がミリ秒単位で30日に等しいこと", () => {
      const opts = refreshTokenCookieOptions(false);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(opts.maxAge).toBe(thirtyDaysMs);
    });
  });
});
