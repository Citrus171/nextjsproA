import { AuthService } from "./auth.service";
import * as bcrypt from "bcrypt";

const makeUser = (overrides = {}) => ({
  id: "user1",
  email: "test@example.com",
  password: "hashed",
  name: "Test",
  createdAt: new Date(),
  ...overrides,
});

const mockUsersService = {
  findByEmail: jest.fn(),
};

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockUsersService as any, mockPrisma as any);
    jest.clearAllMocks();
  });

  // ─── validateUser ────────────────────────────────────────────
  describe("validateUser", () => {
    it("正しいパスワードで id と email を返す", async () => {
      const hashed = await bcrypt.hash("password123", 10);
      mockUsersService.findByEmail.mockResolvedValue(makeUser({ password: hashed }));

      const result = await service.validateUser("test@example.com", "password123");

      expect(result).toEqual({ id: "user1", email: "test@example.com" });
    });

    it("パスワード不一致は null を返す", async () => {
      const hashed = await bcrypt.hash("correct", 10);
      mockUsersService.findByEmail.mockResolvedValue(makeUser({ password: hashed }));

      const result = await service.validateUser("test@example.com", "wrong");

      expect(result).toBeNull();
    });

    it("存在しないメールは null を返す", async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser("nobody@example.com", "pass");

      expect(result).toBeNull();
    });
  });

  // ─── createRefreshToken ──────────────────────────────────────
  describe("createRefreshToken", () => {
    it("96文字の hex トークンを返す", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const token = await service.createRefreshToken("user1");

      expect(typeof token).toBe("string");
      expect(token).toHaveLength(96);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("userId と expiresAt を DB に保存する", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const before = Date.now();

      await service.createRefreshToken("user1");

      const call = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(call.data.userId).toBe("user1");
      expect(call.data.expiresAt.getTime()).toBeGreaterThan(before);
    });
  });

  // ─── rotateRefreshToken ──────────────────────────────────────
  describe("rotateRefreshToken", () => {
    it("有効なトークンを rotate して新トークンと userId・email を返す", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: "old",
        userId: "user1",
        user: { email: "test@example.com" },
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.rotateRefreshToken("old");

      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user1");
      expect(result!.email).toBe("test@example.com");
      expect(result!.newToken).toHaveLength(96);
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { token: "old" } });
    });

    it("存在しないトークンは null を返す", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.rotateRefreshToken("invalid");

      expect(result).toBeNull();
      expect(mockPrisma.refreshToken.delete).not.toHaveBeenCalled();
    });
  });

  // ─── revokeRefreshToken ──────────────────────────────────────
  describe("revokeRefreshToken", () => {
    it("トークンを削除する", async () => {
      mockPrisma.refreshToken.delete.mockResolvedValue({});

      await service.revokeRefreshToken("sometoken");

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { token: "sometoken" } });
    });

    it("存在しないトークンでもエラーを投げない", async () => {
      mockPrisma.refreshToken.delete.mockRejectedValue(new Error("Not found"));

      await expect(service.revokeRefreshToken("ghost")).resolves.not.toThrow();
    });
  });

  // ─── findRefreshToken ────────────────────────────────────────
  describe("findRefreshToken", () => {
    it("トークンレコードを返す", async () => {
      const rec = { token: "t", userId: "user1", expiresAt: new Date(Date.now() + 60 * 60 * 1000) };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(rec);

      const result = await service.findRefreshToken("t");

      expect(result).toEqual(rec);
    });

    it("存在しないトークンは null を返す", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.findRefreshToken("ghost");

      expect(result).toBeNull();
    });

    it("期限切れトークンは null を返す", async () => {
      const expired = { token: "t", userId: "user1", expiresAt: new Date(Date.now() - 1000) };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(expired);

      const result = await service.findRefreshToken("t");

      expect(result).toBeNull();
    });
  });
});
