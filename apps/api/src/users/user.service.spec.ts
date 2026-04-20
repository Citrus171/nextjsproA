import { UsersService } from "./user.service";
import * as bcrypt from "bcrypt";

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(mockPrisma as any);
    jest.clearAllMocks();
  });

  // ─── createUser ──────────────────────────────────────────────
  describe("createUser", () => {
    it("パスワードをハッシュ化して保存する", async () => {
      const created = {
        id: "u1",
        emailEncrypted: "enc",
        nickname: "Alice",
        password: "hashed",
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(created);

      await service.createUser("a@b.com", "plainpass", "Alice");

      const call = mockPrisma.user.create.mock.calls[0][0];
      const isHashed = await bcrypt.compare("plainpass", call.data.password);
      expect(isHashed).toBe(true);
    });

    it("平文パスワードを DB に保存しない", async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: "u1",
        emailEncrypted: "enc",
      });

      await service.createUser("a@b.com", "secret", "Bob");

      const call = mockPrisma.user.create.mock.calls[0][0];
      expect(call.data.password).not.toBe("secret");
    });

    it("nickname を DB に保存する", async () => {
      const created = {
        id: "u1",
        emailEncrypted: "enc",
        nickname: "Alice",
        password: "hashed",
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.createUser("a@b.com", "pass12345", "Alice");

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nickname: "Alice" }),
        })
      );
      expect(result).toMatchObject({ id: "u1", nickname: "Alice" });
    });

    it("Prisma がエラーを投げたら再スローする", async () => {
      mockPrisma.user.create.mockRejectedValue(new Error("DB error"));

      await expect(
        service.createUser("a@b.com", "pass12345", "Alice")
      ).rejects.toThrow("DB error");
    });
  });

  // ─── findByEmail ─────────────────────────────────────────────
  describe("findByEmail", () => {
    it("存在するメールはユーザーを返す", async () => {
      const user = { id: "u1", emailEncrypted: "enc" };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail("a@b.com");

      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(result).toHaveProperty("id", "u1");
    });

    it("存在しないメールは null を返す", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail("nobody@b.com");

      expect(result).toBeNull();
    });
  });

  // ─── findById ────────────────────────────────────────────────
  describe("findById", () => {
    it("存在する ID はユーザーを返す", async () => {
      const user = { id: "u1", emailEncrypted: "enc" };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById("u1");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(result).toHaveProperty("id", "u1");
    });

    it("存在しない ID は null を返す", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById("no-such");

      expect(result).toBeNull();
    });
  });

  // ─── findAll ─────────────────────────────────────────────────
  describe("findAll", () => {
    it("パスワードを含まないユーザー一覧を返す", async () => {
      const users = [
        {
          id: "u1",
          emailEncrypted: "enc1",
          nickname: "Alice",
          createdAt: new Date(),
        },
        {
          id: "u2",
          emailEncrypted: "enc2",
          nickname: "Bob",
          createdAt: new Date(),
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          emailEncrypted: true,
          nickname: true,
          role: true,
          createdAt: true,
        },
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────
  describe("deleteUser", () => {
    it("指定IDのユーザーを削除する", async () => {
      const deleted = { id: "u1", nickname: "Alice" };
      mockPrisma.user.delete.mockResolvedValue(deleted);

      const result = await service.deleteUser("u1");

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(result).toEqual(deleted);
    });

    it("存在しないIDは Prisma エラーを再スローする", async () => {
      const err = Object.assign(new Error("Not found"), { code: "P2025" });
      mockPrisma.user.delete.mockRejectedValue(err);

      await expect(service.deleteUser("no-such")).rejects.toThrow("Not found");
    });
  });
});
