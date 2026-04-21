import { validate } from "class-validator";
import { UpdatePostDto } from "./update-post.dto";

describe("UpdatePostDto", () => {
  it("postType が未指定のときはバリデーションは通ること", async () => {
    const dto = new UpdatePostDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("postType が null のときはバリデーションエラーになること", async () => {
    const dto = Object.assign(new UpdatePostDto(), { postType: null });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "postType")).toBe(true);
  });
});
