import { UsersService } from "./user.service";
import * as bcrypt from "bcrypt";

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
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
      const created = { id: "u1", email: "a@b.com", name: "Alice", password: "hashed", createdAt: new Date() };
      mockPrisma.user.create.mockResolvedValue(created);

      await service.createUser("a@b.com", "plainpass", "Alice");

      const call = mockPrisma.user.create.mock.calls[0][0];
      const isHashed = await bcrypt.compare("plainpass", call.data.password);
      expect(isHashed).toBe(true);
    });

    it("平文パスワードを DB に保存しない", async () => {
      mockPrisma.user.create.mockResolvedValue({ id: "u1", email: "a@b.com" });

      await service.createUser("a@b.com", "secret");

      const call = mockPrisma.user.create.mock.calls[0][0];
      expect(call.data.password).not.toBe("secret");
    });

    it("name なしで作成できる", async () => {
      const created = { id: "u1", email: "a@b.com", name: null, password: "hashed", createdAt: new Date() };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.createUser("a@b.com", "pass");

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: undefined }) }),
      );
      expect(result).toEqual(created);
    });

    it("Prisma がエラーを投げたら再スローする", async () => {
      mockPrisma.user.create.mockRejectedValue(new Error("DB error"));

      await expect(service.createUser("a@b.com", "pass")).rejects.toThrow("DB error");
    });
  });

  // ─── findByEmail ─────────────────────────────────────────────
  describe("findByEmail", () => {
    it("存在するメールはユーザーを返す", async () => {
      const user = { id: "u1", email: "a@b.com" };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail("a@b.com");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "a@b.com" } });
      expect(result).toEqual(user);
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
      const user = { id: "u1", email: "a@b.com" };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById("u1");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
      expect(result).toEqual(user);
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
        { id: "u1", email: "a@b.com", name: "Alice", createdAt: new Date() },
        { id: "u2", email: "b@b.com", name: "Bob", createdAt: new Date() },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true, email: true, name: true, createdAt: true },
      });
      expect(result).toEqual(users);
    });
  });
});
