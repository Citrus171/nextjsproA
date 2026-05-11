import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

const VALID_PASSWORD = "P@ssw0rd1234";

describe("RegisterDto", () => {
  it("name が未指定でもバリデーションは通る", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = VALID_PASSWORD;

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("nickname が未指定でもバリデーションは通る", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = VALID_PASSWORD;
    dto.name = "Alice";

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it("name と nickname があればバリデーションは通る", async () => {
    const dto = new RegisterDto();
    dto.email = "user@example.com";
    dto.password = VALID_PASSWORD;
    dto.name = "Alice";
    dto.nickname = "Alice";

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  describe("パスワード強度バリデーション", () => {
    const buildDto = (password: string) => {
      const dto = new RegisterDto();
      dto.email = "user@example.com";
      dto.password = password;
      return dto;
    };

    it("8文字未満はバリデーションエラー", async () => {
      const errors = await validate(buildDto("P@ssw0r"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("大文字なしはバリデーションエラー", async () => {
      const errors = await validate(buildDto("p@ssw0rd1234"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("小文字なしはバリデーションエラー", async () => {
      const errors = await validate(buildDto("P@SSW0RD1234"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("数字なしはバリデーションエラー", async () => {
      const errors = await validate(buildDto("P@sswordAbcd"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("記号なしはバリデーションエラー", async () => {
      const errors = await validate(buildDto("Passw0rd1234"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("よくある弱いパスワード password123 はエラー", async () => {
      const errors = await validate(buildDto("password123"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("12345678901234 はエラー", async () => {
      const errors = await validate(buildDto("12345678901234"));
      expect(errors.some((e) => e.property === "password")).toBe(true);
    });

    it("強いパスワードはバリデーションを通る", async () => {
      const errors = await validate(buildDto(VALID_PASSWORD));
      expect(errors.filter((e) => e.property === "password").length).toBe(0);
    });
  });
});
