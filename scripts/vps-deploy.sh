#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VPS デプロイスクリプト
# =============================================================================
# バックアップ → git pull → 依存インストール → bcrypt rebuild
# → Prisma 生成/マイグレーション → API ビルド → PM2 再起動
# → ヘルスチェック（失敗時自動ロールバック）→ Web ビルド & rsync → Nginx リロード
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
export PROJECT_DIR
PM2_NAME="${PM2_NAME:-api}"
DOMAIN="${DOMAIN:-finder.miyaoo.com}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_WEB="${SKIP_WEB:-false}"
SKIP_ROLLBACK="${SKIP_ROLLBACK:-false}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-30}"

PREV_COMMIT=""
BACKUP_DIR_USED=""

# オプション解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-backup)   SKIP_BACKUP=true; shift ;;
    --skip-web)      SKIP_WEB=true; shift ;;
    --skip-rollback) SKIP_ROLLBACK=true; shift ;;
    --domain)        DOMAIN="$2"; shift 2 ;;
    --pm2-name)      PM2_NAME="$2"; shift 2 ;;
    --help|-h)
      cat <<'EOF'
Usage: vps-deploy.sh [OPTIONS]

Options:
  --skip-backup         デプロイ前のバックアップをスキップ
  --skip-web            Webフロントエンドのビルド・デプロイをスキップ（APIのみ更新）
  --skip-rollback       ヘルスチェック失敗時の自動ロールバックを無効化
  --domain DOMAIN       ヘルスチェック対象のドメイン（デフォルト: finder.miyaoo.com）
  --pm2-name NAME       PM2 プロセス名（デフォルト: api）
  --help, -h            このヘルプを表示

Environment Variables:
  PROJECT_DIR           プロジェクトルートパス（未設定時はスクリプト位置から自動検出）
  PM2_NAME              PM2 プロセス名（デフォルト: api）
  DOMAIN                本番ドメイン（デフォルト: finder.miyaoo.com）
  SKIP_BACKUP           true でバックアップをスキップ
  SKIP_WEB              true で Web デプロイをスキップ
  SKIP_ROLLBACK         true で自動ロールバックを無効化
  HEALTH_TIMEOUT        ヘルスチェックタイムアウト秒数（デフォルト: 30）
EOF
      exit 0
      ;;
    *) echo "不明なオプション: $1"; exit 1 ;;
  esac
done

echo "========================================"
echo "VPS デプロイ開始"
echo "========================================"
echo "PROJECT_DIR    : $PROJECT_DIR"
echo "PM2_NAME       : $PM2_NAME"
echo "DOMAIN         : $DOMAIN"
echo "SKIP_BACKUP    : $SKIP_BACKUP"
echo "SKIP_WEB       : $SKIP_WEB"
echo "SKIP_ROLLBACK  : $SKIP_ROLLBACK"
echo "HEALTH_TIMEOUT : ${HEALTH_TIMEOUT}秒"
echo "========================================"

cd "$PROJECT_DIR"

# ロールバック関数
do_rollback() {
  echo ""
  echo "========================================"
  echo "⚠️  ロールバック開始"
  echo "========================================"

  if [[ -n "$PREV_COMMIT" ]]; then
    echo "git を前コミット ($PREV_COMMIT) に戻します..."
    git reset --hard "$PREV_COMMIT"
  fi

  # 最新バックアップから DB を復元
  if [[ -n "$BACKUP_DIR_USED" && -f "$BACKUP_DIR_USED/db_backup.sql.gz" ]]; then
    echo "DB を復元中: $BACKUP_DIR_USED/db_backup.sql.gz"
    ENV_FILE="$PROJECT_DIR/apps/api/.env"
    if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$ENV_FILE" ]]; then
      DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')
      export DATABASE_URL
    fi
    if [[ -n "${DATABASE_URL:-}" ]]; then
      gunzip -c "$BACKUP_DIR_USED/db_backup.sql.gz" | psql "$DATABASE_URL"
      echo "DB 復元完了"
    else
      echo "DATABASE_URL が設定されていないため DB 復元をスキップ"
    fi
  else
    echo "バックアップが見つからないため DB 復元をスキップ"
  fi

  # 前バージョンをリビルド・再起動
  echo "前バージョンをリビルド中..."
  npm run build --workspace=apps/api || true
  pm2 restart "$PM2_NAME" || true

  echo ""
  echo "========================================"
  echo "❌ ロールバック完了。デプロイは失敗しました。"
  echo "========================================"
  exit 1
}

# ヘルスチェック関数（/api/health が 200 を返すまで待機）
wait_for_health() {
  local timeout="$HEALTH_TIMEOUT"
  local interval=5
  local elapsed=0

  echo "ヘルスチェック待機（/api/health、最大 ${timeout}秒）..."
  sleep 3

  while [[ $elapsed -lt $timeout ]]; do
    if curl -sf "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
      echo "  /api/health → OK（${elapsed}秒後）"
      return 0
    fi
    echo "  /api/health → 待機中... (${elapsed}/${timeout}秒)"
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  echo "  /api/health → タイムアウト（${timeout}秒）"
  return 1
}

# デプロイ前の git コミットを記録
PREV_COMMIT=$(git rev-parse HEAD)

# 1. バックアップ --------------------------------------------------------------------
if [[ "$SKIP_BACKUP" != true ]]; then
  echo ""
  echo "Step 1/10: バックアップ実行"
  ./scripts/vps-backup.sh
  # 最新バックアップディレクトリを記録
  BACKUP_DIR_USED=$(find "$PROJECT_DIR/backups" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -1)
else
  echo ""
  echo "Step 1/10: バックアップをスキップ (--skip-backup)"
fi

# 2. Git 更新 ------------------------------------------------------------------------
echo ""
echo "Step 2/10: Git 更新"
git fetch origin
git checkout main
git pull --ff-only origin main

# 3. 依存インストール ----------------------------------------------------------------
echo ""
echo "Step 3/10: npm ci"
npm ci --ignore-scripts

# 3.5. bcrypt ネイティブバイナリのリビルド（--ignore-scripts でスキップされるため）
echo ""
echo "Step 3.5/10: bcrypt rebuild"
(cd apps/api && npm rebuild bcrypt)

# 4. Prisma 準備 ---------------------------------------------------------------------
echo ""
echo "Step 4/10: Prisma generate & migrate deploy"
npm run prisma:generate
(cd apps/api && npx prisma migrate deploy)

# 5. API ビルド ----------------------------------------------------------------------
echo ""
echo "Step 5/10: API ビルド"
npm run build --workspace=apps/api

# 6. PM2 再起動 ----------------------------------------------------------------------
echo ""
echo "Step 6/10: PM2 再起動 ($PM2_NAME)"
pm2 restart "$PM2_NAME"

# 6.5. ヘルスチェック（失敗時自動ロールバック）--------------------------------------
echo ""
echo "Step 6.5/10: デプロイ後ヘルスチェック"
if ! wait_for_health; then
  if [[ "$SKIP_ROLLBACK" != true ]]; then
    do_rollback
  else
    echo "  --skip-rollback フラグのためロールバックをスキップ"
    exit 1
  fi
fi

# 7. Web フロントエンドビルド --------------------------------------------------------
if [[ "$SKIP_WEB" != true ]]; then
  echo ""
  echo "Step 7/10: Web フロントエンドビルド"
  npm run build --workspace=apps/web
else
  echo ""
  echo "Step 7/10: Web ビルドをスキップ (--skip-web)"
fi

# 8. ファイル同期 ---------------------------------------------------------------------
if [[ "$SKIP_WEB" != true ]]; then
  echo ""
  echo "Step 8/10: rsync で /var/www/finder-web/ に同期"
  rsync -av --delete "$PROJECT_DIR/apps/web/dist/" /var/www/finder-web/
else
  echo ""
  echo "Step 8/10: rsync をスキップ (--skip-web)"
fi

# 9. Nginx リロード ------------------------------------------------------------------
echo ""
echo "Step 9/10: Nginx 設定テスト & リロード"
sudo nginx -t && sudo systemctl reload nginx

# 10. 最終確認 -----------------------------------------------------------------------
echo ""
echo "Step 10/10: 最終ヘルスチェック"
if curl -sf "http://127.0.0.1:3000/api/health" >/dev/null; then
  echo "  API (localhost:3000/api/health) → OK"
else
  echo "  API (localhost:3000/api/health) → NG"
  exit 1
fi

if curl -sf "https://${DOMAIN}/api/health" >/dev/null; then
  echo "  API (https://${DOMAIN}/api/health) → OK"
else
  echo "  API (https://${DOMAIN}/api/health) → チェック不可（Nginx 経由でない場合は正常）"
fi

echo ""
echo "========================================"
echo "デプロイ完了！"
echo "========================================"
