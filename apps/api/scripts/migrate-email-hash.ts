/**
 * SHA256 emailHash → HMAC 移行スクリプト
 *
 * 使い方:
 *   npx ts-node scripts/migrate-email-hash.ts           # 本番実行
 *   npx ts-node scripts/migrate-email-hash.ts --dry-run # 確認のみ（DB変更なし）
 *
 * 事前準備:
 *   1. DBのフルバックアップを取得すること
 *      pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
 *   2. .env に ENCRYPTION_KEY と HMAC_SECRET が設定されていること
 */

import "reflect-metadata";
import { config } from "dotenv";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { CryptoService } from "../src/identity/crypto.service";
import { migrateEmailHashToHmac } from "../src/identity/email-hash-migration";

config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("[dry-run] DBは更新されません。確認のみ実行します。");
  }

  const prisma = new PrismaClient();
  const configService = new ConfigService();
  const cryptoService = new CryptoService(configService);
  cryptoService.onModuleInit();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await migrateEmailHashToHmac(prisma as any, cryptoService, {
      dryRun,
    });
    console.log("マイグレーション完了:");
    console.log(`  合計     : ${result.total}`);
    console.log(`  更新済み : ${result.migrated}`);
    console.log(`  スキップ : ${result.skipped}`);
    console.log(`  エラー   : ${result.errors}`);

    if (result.errors > 0) {
      console.warn(
        "一部ユーザーの移行に失敗しました。ログを確認してください。"
      );
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
