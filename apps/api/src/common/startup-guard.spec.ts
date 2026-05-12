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

  it("本番かつ強い JWT_SECRET かつ必要なシークレットが揃っていれば throw しない", () => {
    expect(() =>
      assertSecrets({
        NODE_ENV: "production",
        JWT_SECRET: "super-secret-random-value-abc123XYZ!@#",
        ENCRYPTION_KEY_V1: "encryption-key-at-least-32-chars-long!!",
        HMAC_SECRET: "hmac-secret-value-here",
        DATABASE_URL: "postgresql://localhost:5432/mydb",
      })
    ).not.toThrow();
  });

  it("本番かつ ENCRYPTION_KEY_V1 が短すぎるなら throw する", () => {
    expect(() =>
      assertSecrets({
        NODE_ENV: "production",
        JWT_SECRET: "super-secret-random-value-abc123XYZ!@#",
        ENCRYPTION_KEY_V1: "short",
        HMAC_SECRET: "hmac-secret",
        DATABASE_URL: "postgresql://localhost:5432/mydb",
      })
    ).toThrow("ENCRYPTION_KEY_V1");
  });

  it("本番かつ HMAC_SECRET が未設定なら throw する", () => {
    expect(() =>
      assertSecrets({
        NODE_ENV: "production",
        JWT_SECRET: "super-secret-random-value-abc123XYZ!@#",
        ENCRYPTION_KEY_V1: "encryption-key-at-least-32-chars-long!!",
        DATABASE_URL: "postgresql://localhost:5432/mydb",
      })
    ).toThrow("HMAC_SECRET");
  });

  it("本番かつ DATABASE_URL が未設定なら throw する", () => {
    expect(() =>
      assertSecrets({
        NODE_ENV: "production",
        JWT_SECRET: "super-secret-random-value-abc123XYZ!@#",
        ENCRYPTION_KEY_V1: "encryption-key-at-least-32-chars-long!!",
        HMAC_SECRET: "hmac-secret",
      })
    ).toThrow("DATABASE_URL");
  });
});
