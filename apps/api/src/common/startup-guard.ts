export function assertSecrets(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return;
  const secret = env.JWT_SECRET ?? "";
  if (!secret || secret.includes("change-me")) {
    throw new Error(
      "本番環境では JWT_SECRET に安全なランダム値を設定してください"
    );
  }
}
