import { validate } from "class-validator";
import { CreateSightingDto } from "./create-sighting.dto";

describe("CreateSightingDto", () => {
  it("postId がなくてもバリデーションエラーにならないこと", async () => {
    const dto = new CreateSightingDto();
    dto.lat = 35.9;
    dto.lng = 139.6;
    dto.sightedAt = "2026-04-19T10:00:00.000Z";

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
