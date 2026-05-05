#!/usr/bin/env node
/**
 * emailEncrypted/emailHash 修正スクリプト
 * 旧フォーマット（iv:enc:tag, hex鍵）→ 新フォーマット（v1:iv:enc:tag, base64鍵）へ移行
 *
 * 使い方:
 *   node scripts/fix-email-migration.js --dry-run
 *   node scripts/fix-email-migration.js
 *
 * .env に以下が必要:
 *   ENCRYPTION_KEY_LEGACY=<旧hex鍵>
 *   ENCRYPTION_KEY_V1=<新base64鍵>
 *   ENCRYPTION_KEY_CURRENT=v1
 *   HMAC_SECRET=<hmac秘密鍵>
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const legacyHex = process.env.ENCRYPTION_KEY_LEGACY;
const v1B64 = process.env.ENCRYPTION_KEY_V1;
const keyId = process.env.ENCRYPTION_KEY_CURRENT || "v1";
const hmacSecret = process.env.HMAC_SECRET;

if (!legacyHex || !v1B64 || !hmacSecret) {
  console.error(
    "必須環境変数が不足しています: ENCRYPTION_KEY_LEGACY, ENCRYPTION_KEY_V1, HMAC_SECRET"
  );
  process.exit(1);
}

const legacyKey = Buffer.from(legacyHex, "hex");
const v1Key = Buffer.from(v1B64, "base64");

function tryDecrypt(blob) {
  const parts = blob.split(":");

  // 新フォーマット: keyId:iv:enc:tag
  if (parts.length === 4) {
    const [, ivB64, encB64, tagB64] = parts;
    try {
      const iv = Buffer.from(ivB64, "base64");
      const enc = Buffer.from(encB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const d = crypto.createDecipheriv("aes-256-gcm", v1Key, iv);
      d.setAuthTag(tag);
      return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
    } catch {
      // fall through
    }
  }

  // 旧フォーマット: iv:enc:tag (hex鍵)
  if (parts.length === 3) {
    const [ivB64, encB64, tagB64] = parts;
    try {
      const iv = Buffer.from(ivB64, "base64");
      const enc = Buffer.from(encB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const d = crypto.createDecipheriv("aes-256-gcm", legacyKey, iv);
      d.setAuthTag(tag);
      return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
    } catch {
      return null;
    }
  }

  return null;
}

function encryptNew(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", v1Key, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return `${keyId}:${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

function computeHmac(normalized) {
  return crypto
    .createHmac("sha256", hmacSecret)
    .update(normalized)
    .digest("hex");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("[dry-run] DBは更新されません");

  const prisma = new PrismaClient();
  let migrated = 0,
    skipped = 0,
    errors = 0;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, emailEncrypted: true, emailHash: true },
    });
    console.log(`合計: ${users.length} 件`);

    for (const user of users) {
      if (!user.emailEncrypted) {
        skipped++;
        continue;
      }

      const plain = tryDecrypt(user.emailEncrypted);
      if (!plain) {
        console.error(`ユーザー ${user.id}: 復号失敗`);
        errors++;
        continue;
      }

      const normalized = plain.toLowerCase().trim();
      const newHash = computeHmac(normalized);
      const newEncrypted = encryptNew(normalized);

      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailHash: newHash, emailEncrypted: newEncrypted },
        });
      }
      console.log(
        `ユーザー ${user.id}: ${dryRun ? "[dry-run] OK" : "移行完了"}`
      );
      migrated++;
    }

    console.log(`\n移行: ${migrated}, スキップ: ${skipped}, エラー: ${errors}`);
    if (errors > 0) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
