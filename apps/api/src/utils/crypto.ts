import * as crypto from "crypto";

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function deriveEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY が設定されていません");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY は base64 エンコードされた 32 バイトのキーである必要があります（現在: ${buf.length} バイト）。` +
        "生成方法: openssl rand -base64 32"
    );
  }
  return buf;
}

export function encryptEmail(plain: string): string {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

export function hmacEmail(normalized: string): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    throw new Error("HMAC_SECRET is not set");
  }
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateSecureToken(): string {
  return crypto.randomBytes(48).toString("hex");
}
