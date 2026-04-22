import {
  OPENAPI_CONVERSATION_ID_EXAMPLE,
  OPENAPI_ID_EXAMPLE,
  OPENAPI_IMAGE_ID_EXAMPLE,
  OPENAPI_MESSAGE_ID_EXAMPLE,
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
  OPENAPI_USER_ID_EXAMPLE,
} from "./openapi-examples";

describe("OpenAPI example IDs", () => {
  it("用途別の OpenAPI 例示 ID が重複しないこと", () => {
    const ids = [
      OPENAPI_USER_ID_EXAMPLE,
      OPENAPI_POST_ID_EXAMPLE,
      OPENAPI_IMAGE_ID_EXAMPLE,
      OPENAPI_SIGHTING_ID_EXAMPLE,
      OPENAPI_CONVERSATION_ID_EXAMPLE,
      OPENAPI_MESSAGE_ID_EXAMPLE,
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("汎用 ID 例示は投稿 ID 例示と一致すること", () => {
    expect(OPENAPI_ID_EXAMPLE).toBe(OPENAPI_POST_ID_EXAMPLE);
  });
});
