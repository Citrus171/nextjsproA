import { assertSecrets } from "./startup-guard";

describe("assertSecrets", () => {
  it("development では何もしない", () => {
    expect(() =>
      assertSecrets({ NODE_ENV: "development", JWT_SECRET: "change-me" })
    ).not.toThrow();
  });

  it("NODE_ENV 未設定では何もしない", () => {
    expect(() => assertSecrets({ JWT_SECRET: "change-me" })).not.toThrow();
  });

  it("本番かつ JWT_SECRET が未設定なら throw する", () => {
    expect(() => assertSecrets({ NODE_ENV: "production" })).toThrow(
      "JWT_SECRET"
    );
  });

  it("本番かつ JWT_SECRET が change-me を含むなら throw する", () => {
    expect(() =>
      assertSecrets({
        NODE_ENV: "production",
        JWT_SECRET: "change-me-in-production",
      })
    ).toThrow("JWT_SECRET");
  });

  it("本番かつ強い JWT_SECRET なら throw しない", () => {
    expect(() =>
      assertSecrets({
        NODE_ENV: "production",
        JWT_SECRET: "super-secret-random-value-abc123XYZ!@#",
      })
    ).not.toThrow();
  });
});
