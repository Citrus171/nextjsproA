import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { UsersController } from "./user.controller";
import { RegisterDto } from "./dto/register.dto";

describe("UsersController", () => {
  let controller: UsersController;
  const mockUsersService = {
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  beforeEach(() => {
    controller = new UsersController(mockUsersService as any);
    jest.clearAllMocks();
  });

  it("nickname と name がないと BadRequestException を返す", async () => {
    const dto = {
      email: "a@b.com",
      password: "password123",
    } as RegisterDto;

    await expect(controller.register(dto)).rejects.toThrow(BadRequestException);
    expect(mockUsersService.createUser).not.toHaveBeenCalled();
  });

  it("ConflictException はそのまま伝播する", async () => {
    mockUsersService.createUser.mockRejectedValue(
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
    mockUsersService.createUser.mockResolvedValue({
      id: "user1",
      email: "a@b.com",
      nickname: "Alice",
      createdAt,
    });

    const result = await controller.register({
      email: "a@b.com",
      password: "password123",
      nickname: "Alice",
    } as RegisterDto);

    expect(mockUsersService.createUser).toHaveBeenCalledWith(
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
    mockUsersService.createUser.mockResolvedValue({
      id: "user1",
      email: "a@b.com",
      nickname: "Alice",
    });

    await controller.register({
      email: "a@b.com",
      password: "password123",
      name: "Alice",
    } as RegisterDto);

    expect(mockUsersService.createUser).toHaveBeenCalledWith(
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
        nickname: "Alice",
        role: "user",
        createdAt: new Date(),
      };
      mockUsersService.deleteUser.mockResolvedValue(deleted);

      const result = await controller.remove("user1");

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith("user1");
      expect(result).toBe(deleted);
    });

    it("存在しないユーザーIDはP2025エラーを404に変換する", async () => {
      mockUsersService.deleteUser.mockRejectedValue({ code: "P2025" });

      await expect(controller.remove("nonexistent")).rejects.toThrow(
        HttpException
      );

      try {
        await controller.remove("nonexistent");
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        const body = (e as HttpException).getResponse() as { error: string };
        expect(body.error).toBe("ユーザーが見つかりません");
      }
    });

    it("P2025以外のエラーは再スローされる", async () => {
      const dbError = new Error("DB接続エラー");
      mockUsersService.deleteUser.mockRejectedValue(dbError);

      await expect(controller.remove("user1")).rejects.toThrow(dbError);
    });
  });
});
