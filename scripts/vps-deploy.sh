#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VPS デプロイスクリプト
# =============================================================================
# バックアップ → git pull → 依存インストール → Prisma 生成/マイグレーション
# → API ビルド → PM2 再起動 → Web ビルド & rsync → Nginx リロード → ヘルスチェック
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
export PROJECT_DIR
PM2_NAME="${PM2_NAME:-api}"
DOMAIN="${DOMAIN:-finder.miyaoo.com}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_WEB="${SKIP_WEB:-false}"

# オプション解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-backup) SKIP_BACKUP=true; shift ;;
    --skip-web)    SKIP_WEB=true; shift ;;
    --domain)      DOMAIN="$2"; shift 2 ;;
    --pm2-name)    PM2_NAME="$2"; shift 2 ;;
    --help|-h)
      cat <<'EOF'
Usage: vps-deploy.sh [OPTIONS]

Options:
  --skip-backup         デプロイ前のバックアップをスキップ
  --skip-web            Webフロントエンドのビルド・デプロイをスキップ（APIのみ更新）
  --domain DOMAIN       ヘルスチェック対象のドメイン（デフォルト: finder.miyaoo.com）
  --pm2-name NAME       PM2 プロセス名（デフォルト: api）
  --help, -h            このヘルプを表示

Environment Variables:
  PROJECT_DIR           プロジェクトルートパス（未設定時はスクリプト位置から自動検出）
  PM2_NAME              PM2 プロセス名（デフォルト: api）
  DOMAIN                本番ドメイン（デフォルト: finder.miyaoo.com）
  SKIP_BACKUP           true でバックアップをスキップ
  SKIP_WEB              true で Web デプロイをスキップ
EOF
      exit 0
      ;;
    *) echo "不明なオプション: $1"; exit 1 ;;
  esac
done

echo "========================================"
echo "🚀 VPS デプロイ開始"
echo "========================================"
echo "PROJECT_DIR : $PROJECT_DIR"
echo "PM2_NAME    : $PM2_NAME"
echo "DOMAIN      : $DOMAIN"
echo "SKIP_BACKUP : $SKIP_BACKUP"
echo "SKIP_WEB    : $SKIP_WEB"
echo "========================================"

cd "$PROJECT_DIR"

# 1. バックアップ --------------------------------------------------------------------
if [[ "$SKIP_BACKUP" != true ]]; then
  echo ""
  echo "📦 Step 1/10: バックアップ実行"
  ./scripts/vps-backup.sh
else
  echo ""
  echo "⏭️  Step 1/10: バックアップをスキップ (--skip-backup)"
fi

# 2. Git 更新 ------------------------------------------------------------------------
echo ""
echo "📥 Step 2/10: Git 更新"
git fetch origin
git checkout main
git pull --ff-only origin main

# 3. 依存インストール ----------------------------------------------------------------
echo ""
echo "📦 Step 3/10: npm ci"
npm ci

# 4. Prisma 準備 ---------------------------------------------------------------------
echo ""
echo "🔄 Step 4/10: Prisma generate & migrate deploy"
npm run prisma:generate
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# 5. API ビルド ----------------------------------------------------------------------
echo ""
echo "🏗️  Step 5/10: API ビルド"
npm run build --workspace=apps/api

# 6. PM2 再起動 ----------------------------------------------------------------------
echo ""
echo "🔄 Step 6/10: PM2 再起動 ($PM2_NAME)"
pm2 restart "$PM2_NAME"

# 7. Web フロントエンドビルド --------------------------------------------------------
if [[ "$SKIP_WEB" != true ]]; then
  echo ""
  echo "🏗️  Step 7/10: Web フロントエンドビルド"
  npm run build --workspace=apps/web
else
  echo ""
  echo "⏭️  Step 7/10: Web ビルドをスキップ (--skip-web)"
fi

# 8. ファイル同期 ---------------------------------------------------------------------
if [[ "$SKIP_WEB" != true ]]; then
  echo ""
  echo "📤 Step 8/10: rsync で /var/www/finder-web/ に同期"
  rsync -av --delete "$PROJECT_DIR/apps/web/dist/" /var/www/finder-web/
else
  echo ""
  echo "⏭️  Step 8/10: rsync をスキップ (--skip-web)"
fi

# 9. Nginx リロード ------------------------------------------------------------------
echo ""
echo "🔄 Step 9/10: Nginx 設定テスト & リロード"
sudo nginx -t && sudo systemctl reload nginx

# 10. ヘルスチェック -----------------------------------------------------------------
echo ""
echo "✅ Step 10/10: ヘルスチェック"
sleep 3
if curl -sf "http://127.0.0.1:3000/api-json" >/dev/null; then
  echo "  API (localhost:3000)     → OK"
else
  echo "  API (localhost:3000)     → NG ⚠️"
  exit 1
fi

if curl -sf "https://${DOMAIN}/api-json" >/dev/null; then
  echo "  API (https://${DOMAIN})  → OK"
else
  echo "  API (https://${DOMAIN})  → チェック不可（Nginx 経由でない場合は正常）"
fi

echo ""
echo "========================================"
echo "🎉 デプロイ完了！"
echo "========================================"
