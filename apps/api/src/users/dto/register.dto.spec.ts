import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

describe("RegisterDto", () => {
  it("name が未指定のとき、バリデーションエラーになる", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = "password123";

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((err) => err.property === "name")).toBe(true);
  });
});
