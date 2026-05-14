import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateMessageDto } from "./create-message.dto";

describe("CreateMessageDto", () => {
  it("bodyもなしでもDTOバリデーションは通過すること（空メッセージチェックはサービス層で行う）", async () => {
    const dto = plainToInstance(CreateMessageDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("bodyのみ指定でバリデーションが通過すること", async () => {
    const dto = plainToInstance(CreateMessageDto, { body: "こんにちは" });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("bodyが1000文字を超える場合はバリデーションエラーになること", async () => {
    const dto = plainToInstance(CreateMessageDto, {
      body: "a".repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("imageUrlを含む入力を渡してもDTOに imageUrl プロパティが存在しないこと", () => {
    const dto = plainToInstance(CreateMessageDto, {
      body: "こんにちは",
      imageUrl: "http://evil.com/track.gif",
    });
    expect((dto as Record<string, unknown>)["imageUrl"]).toBeUndefined();
  });
});
