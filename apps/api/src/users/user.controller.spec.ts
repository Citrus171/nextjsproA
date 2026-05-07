import { BadRequestException, ConflictException } from "@nestjs/common";
import { UsersController } from "./user.controller";
import { RegisterDto } from "./dto/register.dto";

describe("UsersController", () => {
  let controller: UsersController;
  const mockIdentityService = {
    register: jest.fn(),
    deleteUser: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(() => {
    controller = new UsersController(mockIdentityService as any);
    jest.clearAllMocks();
  });

  it("nickname と name がないと BadRequestException を返す", async () => {
    const dto = {
      email: "a@b.com",
      password: "password123",
    } as RegisterDto;

    await expect(controller.register(dto)).rejects.toThrow(BadRequestException);
    expect(mockIdentityService.register).not.toHaveBeenCalled();
  });

  it("ConflictException はそのまま伝播する", async () => {
    mockIdentityService.register.mockRejectedValue(
      new ConflictException("このニックネームはすでに使用されています")
    );

    const dto = {
      email: "a@b.com",
      password: "password123",
      nickname: "Alice",
    } as RegisterDto;

    await expect(controller.register(dto)).rejects.toThrow(ConflictException);
  });

  it("nickname があれば service に渡す", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    mockIdentityService.register.mockResolvedValue({
      id: "user1",
      email: "a@b.com",
      nickname: "Alice",
      role: "user",
      createdAt,
    });

    const result = await controller.register({
      email: "a@b.com",
      password: "password123",
      nickname: "Alice",
    } as RegisterDto);

    expect(mockIdentityService.register).toHaveBeenCalledWith(
      "a@b.com",
      "password123",
      "Alice"
    );
    expect(result).toEqual({
      id: "user1",
      email: "a@b.com",
      nickname: "Alice",
      createdAt,
    });
  });

  it("nickname がなくても name を後方互換で使う", async () => {
    mockIdentityService.register.mockResolvedValue({
      id: "user1",
      email: "a@b.com",
      nickname: "Alice",
      role: "user",
      createdAt: new Date(),
    });

    await controller.register({
      email: "a@b.com",
      password: "password123",
      name: "Alice",
    } as RegisterDto);

    expect(mockIdentityService.register).toHaveBeenCalledWith(
      "a@b.com",
      "password123",
      "Alice"
    );
  });

  // ─── remove ─────────────────────────────────────────────────
  describe("remove", () => {
    it("管理者がユーザーを削除できる", async () => {
      const deleted = {
        id: "user1",
        email: "a@b.com",
        nickname: "Alice",
        role: "user",
        createdAt: new Date(),
      };
      mockIdentityService.deleteUser.mockResolvedValue(deleted);

      const result = await controller.remove("user1");

      expect(mockIdentityService.deleteUser).toHaveBeenCalledWith("user1");
      expect(result).toBe(deleted);
    });

    it("deleteUserがエラーを投げたとき、そのエラーが伝播すること", async () => {
      const dbError = new Error("DB接続エラー");
      mockIdentityService.deleteUser.mockRejectedValue(dbError);

      await expect(controller.remove("user1")).rejects.toThrow(dbError);
    });
  });
});
