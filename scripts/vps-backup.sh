#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VPS バックアップスクリプト
# =============================================================================
# DB (pg_dump) と uploads を日時付きで保存し、古いバックアップを自動削除
# =============================================================================

OUTPUT_DIR="${OUTPUT_DIR:-~/finder-backend/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
UPLOADS_ONLY="${UPLOADS_ONLY:-false}"
DB_ONLY="${DB_ONLY:-false}"

# 環境変数読み込み（DATABASE_URL）
set -a
[[ -f ~/finder-backend/apps/api/.env ]] && . ~/finder-backend/apps/api/.env
set +a

# オプション解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)     OUTPUT_DIR="$2"; shift 2 ;;
    --retain)     RETAIN_DAYS="$2"; shift 2 ;;
    --uploads-only) UPLOADS_ONLY=true; shift ;;
    --db-only)    DB_ONLY=true; shift ;;
    --help|-h)
      cat <<'EOF'
Usage: vps-backup.sh [OPTIONS]

Options:
  --output DIR          バックアップ出力先（デフォルト: ~/finder-backend/backups）
  --retain N            N 日分以上前のバックアップを削除（デフォルト: 7）
  --uploads-only        uploads のみバックアップ
  --db-only             DB のみバックアップ
  --help, -h            このヘルプを表示
EOF
      exit 0
      ;;
    *) echo "不明なオプション: $1"; exit 1 ;;
  esac
done

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$OUTPUT_DIR/$TIMESTAMP"
PROJECT_DIR="${PROJECT_DIR:-~/finder-backend}"

mkdir -p "$BACKUP_DIR"

echo "========================================"
echo "💾 VPS バックアップ"
echo "========================================"
echo "OUTPUT_DIR  : $OUTPUT_DIR"
echo "RETAIN_DAYS : $RETAIN_DAYS"
echo "BACKUP_DIR  : $BACKUP_DIR"
echo "UPLOADS_ONLY: $UPLOADS_ONLY"
echo "DB_ONLY     : $DB_ONLY"
echo "========================================"

# DB バックアップ
if [[ "$UPLOADS_ONLY" != true ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "⚠️  DATABASE_URL が設定されていません。DB バックアップをスキップします。"
  else
    echo ""
    echo "📦 DB バックアップ中..."
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/db_backup.sql.gz"
    ls -lh "$BACKUP_DIR/db_backup.sql.gz"
  fi
fi

# uploads バックアップ
if [[ "$DB_ONLY" != true ]]; then
  UPLOADS_DIR="$PROJECT_DIR/apps/api/uploads"
  if [[ -d "$UPLOADS_DIR" ]]; then
    echo ""
    echo "📦 uploads バックアップ中..."
    tar czf "$BACKUP_DIR/uploads_backup.tar.gz" -C "$PROJECT_DIR/apps/api" uploads
    ls -lh "$BACKUP_DIR/uploads_backup.tar.gz"
  else
    echo ""
    echo "⏭️  uploads ディレクトリが存在しません。スキップします。"
  fi
fi

# 古いバックアップ削除
echo ""
echo "🧹 ${RETAIN_DAYS} 日以上前のバックアップを削除..."
find "$OUTPUT_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +$((RETAIN_DAYS - 1)) -print -exec rm -rf {} \; 2>/dev/null || true

echo ""
echo "========================================"
echo "✅ バックアップ完了: $BACKUP_DIR"
echo "========================================"
