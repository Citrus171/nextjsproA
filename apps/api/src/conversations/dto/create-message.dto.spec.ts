import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateMessageDto } from "./create-message.dto";

describe("CreateMessageDto", () => {
  it("bodyもimageUrlも両方指定なしでもDTOバリデーションは通過すること（空メッセージチェックはサービス層で行う）", async () => {
    const dto = plainToInstance(CreateMessageDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("bodyのみ指定でバリデーションが通過すること", async () => {
    const dto = plainToInstance(CreateMessageDto, { body: "こんにちは" });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("imageUrlのみ指定でバリデーションが通過すること", async () => {
    const dto = plainToInstance(CreateMessageDto, {
      imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("bodyとimageUrl両方指定でバリデーションが通過すること", async () => {
    const dto = plainToInstance(CreateMessageDto, {
      body: "こんにちは",
      imageUrl: "/uploads/conversations/conv-1/uuid.jpg",
    });
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
});
