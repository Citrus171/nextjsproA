import { BadRequestException, ConflictException } from "@nestjs/common";
import { UsersController } from "./user.controller";
import { RegisterDto } from "./dto/register.dto";

describe("UsersController", () => {
  let controller: UsersController;
  const mockUsersService = {
    createUser: jest.fn(),
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
    mockUsersService.createUser.mockResolvedValue({
      id: "user1",
      email: "a@b.com",
      nickname: "Alice",
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
});
