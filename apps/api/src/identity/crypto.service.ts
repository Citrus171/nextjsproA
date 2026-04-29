import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class CryptoService {
  constructor(private readonly config: ConfigService) {}

  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  encryptEmail(plain: string): string {
    const key = this.deriveEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
  }

  decryptEmail(blob: string): string | null {
    const key = this.deriveEncryptionKey();
    const parts = blob.split(":");
    if (parts.length !== 3) return null;
    try {
      const iv = Buffer.from(parts[0], "base64");
      const enc = Buffer.from(parts[1], "base64");
      const tag = Buffer.from(parts[2], "base64");
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

  private deriveEncryptionKey(): Buffer {
    const raw = this.config.getOrThrow<string>("ENCRYPTION_KEY");
    let buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
    buf = Buffer.from(raw, "hex");
    if (buf.length === 32) return buf;
    buf = Buffer.from(raw, "utf8");
    if (buf.length >= 32) return buf.slice(0, 32);
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (base64/hex/utf8)");
  }
}
