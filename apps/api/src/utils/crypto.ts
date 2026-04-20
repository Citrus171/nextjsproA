import * as crypto from "crypto";

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function deriveEncryptionKey(raw: string | undefined) {
  if (!raw) throw new Error("ENCRYPTION_KEY not set");
  // try base64, then hex, then utf8
  let buf = Buffer.from(raw, "base64");
  if (buf.length === 32) return buf;
  buf = Buffer.from(raw, "hex");
  if (buf.length === 32) return buf;
  buf = Buffer.from(raw, "utf8");
  if (buf.length >= 32) return buf.slice(0, 32);
  throw new Error("ENCRYPTION_KEY must decode to 32 bytes (base64/hex/utf8)");
}

export function encryptEmail(plain: string) {
  const key = deriveEncryptionKey(process.env.ENCRYPTION_KEY);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptEmail(blob: string) {
  const key = deriveEncryptionKey(process.env.ENCRYPTION_KEY);
  const parts = blob.split(":");
  if (parts.length !== 3) return null;
  const iv = Buffer.from(parts[0], "base64");
  const enc = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(enc), decipher.final()]);
  return out.toString("utf8");
}

export function hmacEmail(normalized: string) {
  const secret = process.env.HMAC_SECRET;
  if (!secret) throw new Error("HMAC_SECRET not set");
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export { normalizeEmail };
