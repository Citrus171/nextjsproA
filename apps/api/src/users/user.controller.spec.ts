import { ConflictException } from "@nestjs/common";
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

  it("ConflictException はそのまま伝播する", async () => {
    mockUsersService.createUser.mockRejectedValue(
      new ConflictException("このニックネームはすでに使用されています")
    );

    const dto = {
      email: "a@b.com",
      password: "password123",
      name: "Alice",
    } as RegisterDto;

    await expect(controller.register(dto)).rejects.toThrow(ConflictException);
  });
});
