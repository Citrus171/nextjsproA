import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

describe("RegisterDto", () => {
  it("name が未指定でもバリデーションは通る", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = "password123";

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("nickname が未指定でもバリデーションは通る", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = "password123";
    dto.name = "Alice";

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("name と nickname があればバリデーションは通る", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = "password123";
    dto.name = "Alice";
    dto.nickname = "Alice";

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
