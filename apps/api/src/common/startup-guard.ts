export function assertSecrets(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return;

  const jwtSecret = env.JWT_SECRET ?? "";
  if (!jwtSecret || jwtSecret.includes("change-me")) {
    throw new Error(
      "本番環境では JWT_SECRET に安全なランダム値を設定してください"
    );
  }

  const encryptionKey = env.ENCRYPTION_KEY_V1 ?? "";
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error(
      "本番環境では ENCRYPTION_KEY_V1 に32文字以上の安全な値を設定してください"
    );
  }

  const hmacSecret = env.HMAC_SECRET ?? "";
  if (!hmacSecret) {
    throw new Error("本番環境では HMAC_SECRET を設定してください");
  }

  if (!env.DATABASE_URL) {
    throw new Error("本番環境では DATABASE_URL を設定してください");
  }
}
