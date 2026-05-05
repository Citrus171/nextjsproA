import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class CryptoService implements OnModuleInit {
  private keyMap: Map<string, Buffer> | null = null;
  private currentKeyId: string | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.ensureKeysLoaded();
  }

  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  encryptEmail(plain: string): string {
    this.ensureKeysLoaded();
    const keyId = this.currentKeyId!;
    const key = this.keyMap!.get(keyId)!;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${keyId}:${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
  }

  decryptEmail(blob: string): string | null {
    this.ensureKeysLoaded();
    const parts = blob.split(":");
    if (parts.length !== 4) return null;
    const [keyId, ivB64, encB64, tagB64] = parts;
    const key = this.keyMap!.get(keyId);
    if (!key) return null;
    try {
      const iv = Buffer.from(ivB64, "base64");
      const enc = Buffer.from(encB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const out = Buffer.concat([decipher.update(enc), decipher.final()]);
      return out.toString("utf8");
    } catch {
      return null;
    }
  }

  hmacEmail(normalized: string): string {
    const secret = this.config.getOrThrow<string>("HMAC_SECRET");
    return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
  }

  sha256Hex(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  generateSecureToken(): string {
    return crypto.randomBytes(48).toString("hex");
  }

  private ensureKeysLoaded(): void {
    if (this.keyMap !== null) return;
    const currentKeyId = this.config.getOrThrow<string>(
      "ENCRYPTION_KEY_CURRENT"
    );
    const map = new Map<string, Buffer>();

    for (let i = 1; i <= 20; i++) {
      const value = this.config.get<string>(`ENCRYPTION_KEY_V${i}`);
      if (!value) continue;
      const keyId = `v${i}`;
      const buf = Buffer.from(value, "base64");
      if (buf.length !== 32) {
        throw new Error(
          `ENCRYPTION_KEY_V${i} は base64 エンコードされた 32 バイトのキーである必要があります（現在: ${buf.length} バイト）。` +
            "生成方法: openssl rand -base64 32"
        );
      }
      map.set(keyId, buf);
    }

    if (!map.has(currentKeyId)) {
      throw new Error(
        `ENCRYPTION_KEY_CURRENT="${currentKeyId}" に対応する鍵が見つかりません。` +
          `ENCRYPTION_KEY_V<n> に対応する環境変数を設定してください。`
      );
    }

    this.keyMap = map;
    this.currentKeyId = currentKeyId;
  }
}
