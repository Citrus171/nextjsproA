/**
 * 暗号鍵バージョニングマイグレーションスクリプト
 *
 * 旧形式 emailEncrypted（<iv>:<enc>:<tag>）に v1: プレフィックスを付与する。
 * 新形式: v1:<iv>:<enc>:<tag>
 *
 * 使い方:
 *   npx ts-node scripts/migrate-key-versioning.ts           # 本番実行
 *   npx ts-node scripts/migrate-key-versioning.ts --dry-run # 確認のみ（DB変更なし）
 *
 * 事前準備:
 *   1. DBのフルバックアップを取得すること
 *      bash scripts/vps-backup.sh --db-only
 *   2. .env に ENCRYPTION_KEY_V1 と ENCRYPTION_KEY_CURRENT が設定されていること
 *
 * デプロイ順序:
 *   1. このスクリプトを実行して全 emailEncrypted に v1: を付与
 *   2. 新 CryptoService（ENCRYPTION_KEY_CURRENT/V1 対応）を含むコードをデプロイ
 */

import "reflect-metadata";
import { config } from "dotenv";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { migrateKeyVersioning } from "../src/identity/key-versioning-migration";

config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("[dry-run] DBは更新されません。確認のみ実行します。");
  }

  const prisma = new PrismaClient();

  try {
    const result = await migrateKeyVersioning(prisma, { dryRun });
    console.log("鍵バージョニングマイグレーション完了:");
    console.log(`  合計     : ${result.total}`);
    console.log(`  更新済み : ${result.migrated}`);
    console.log(`  スキップ : ${result.skipped}`);
    console.log(`  エラー   : ${result.errors}`);

    if (result.errors > 0) {
      console.error(
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
