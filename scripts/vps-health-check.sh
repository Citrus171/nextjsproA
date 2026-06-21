#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VPS ヘルスチェックスクリプト
# =============================================================================
# PM2 / API / Web サイト / SSL 証明書期限 / ディスク容量 を確認
# =============================================================================

DOMAIN="${DOMAIN:-your-domain.example.com}"
PM2_NAME="${PM2_NAME:-api}"
VERBOSE="${VERBOSE:-false}"

# オプション解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)    DOMAIN="$2"; shift 2 ;;
    --pm2-name)  PM2_NAME="$2"; shift 2 ;;
    --verbose|-v) VERBOSE=true; shift ;;
    --help|-h)
      cat <<'EOF'
Usage: vps-health-check.sh [OPTIONS]

Options:
  --domain DOMAIN       チェック対象ドメイン
  --pm2-name NAME       PM2 プロセス名
  --verbose, -v         詳細出力（最新の API ログ / Nginx エラーログも表示）
  --help, -h            このヘルプを表示
EOF
      exit 0
      ;;
    *) echo "不明なオプション: $1"; exit 1 ;;
  esac
done

echo "========================================"
echo "🏥 VPS ヘルスチェック"
echo "========================================"
echo "DOMAIN   : $DOMAIN"
echo "PM2_NAME : $PM2_NAME"
echo "VERBOSE  : $VERBOSE"
echo "========================================"

ALL_OK=true

# 1. システムサービス ---------------------------------------------------------------
echo ""
echo "🖥️  [1/6] システムサービス"
for svc in postgresql nginx; do
  if systemctl is-active --quiet "$svc"; then
    echo "  $svc  → OK (running)"
  else
    echo "  $svc  → NG (stopped) ⚠️"
    ALL_OK=false
  fi
done

# 2. PM2 プロセス --------------------------------------------------------------------
echo ""
echo "🔄 [2/6] PM2 プロセス ($PM2_NAME)"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  PM2_STATUS=$(pm2 describe "$PM2_NAME" 2>/dev/null | grep -E '^\s+status' | awk '{print $NF}' | head -1)
  PM2_STATUS="${PM2_STATUS:-unknown}"
  if [[ "$PM2_STATUS" == "online" ]]; then
    echo "  $PM2_NAME  → OK ($PM2_STATUS)"
  else
    echo "  $PM2_NAME  → NG ($PM2_STATUS) ⚠️"
    ALL_OK=false
  fi
else
  echo "  $PM2_NAME  → NG (not found) ⚠️"
  ALL_OK=false
fi

# 3. API 疎通確認 -------------------------------------------------------------------
echo ""
echo "🔗 [3/6] API 疎通確認 (localhost:3000)"
if curl -sf "http://127.0.0.1:3000/api-json" >/dev/null; then
  echo "  http://127.0.0.1:3000/api-json  → OK"
else
  echo "  http://127.0.0.1:3000/api-json  → NG ⚠️"
  ALL_OK=false
fi

# 4. Web サイト疎通確認 --------------------------------------------------------------
echo ""
echo "🔗 [4/6] Web サイト疎通確認 (https://${DOMAIN})"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" || true)
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
  echo "  https://${DOMAIN}  → OK (HTTP $HTTP_CODE)"
else
  echo "  https://${DOMAIN}  → NG (HTTP ${HTTP_CODE:-N/A}) ⚠️"
  ALL_OK=false
fi

# 5. ディスク容量 --------------------------------------------------------------------
echo ""
echo "💾 [5/6] ディスク容量"
DISK_USAGE=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
if [[ "$DISK_USAGE" -lt 80 ]]; then
  echo "  使用率 ${DISK_USAGE}%  → OK"
elif [[ "$DISK_USAGE" -lt 90 ]]; then
  echo "  使用率 ${DISK_USAGE}%  → WARNING (80%以上)"
else
  echo "  使用率 ${DISK_USAGE}%  → CRITICAL (90%以上) ⚠️"
  ALL_OK=false
fi

# 6. SSL 証明書期限 -------------------------------------------------------------------
echo ""
echo "🔐 [6/6] SSL 証明書期限"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
if [[ -f "$CERT_DIR/fullchain.pem" ]]; then
  EXPIRY=$(openssl x509 -noout -enddate -in "$CERT_DIR/fullchain.pem" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [[ "$DAYS_LEFT" -gt 14 ]]; then
    echo "  あと ${DAYS_LEFT} 日  → OK (期限: $EXPIRY)"
  else
    echo "  あと ${DAYS_LEFT} 日  → WARNING (14日以内)"
  fi
else
  echo "  証明書が見つかりません → SKIP"
fi

# 詳細ログ ---------------------------------------------------------------------------
if [[ "$VERBOSE" == true ]]; then
  echo ""
  echo "📜 詳細ログ"
  echo "--- 最新の API ログ (PM2) ---"
  pm2 logs "$PM2_NAME" --lines 10 --nostream 2>/dev/null || echo "  (ログ取得不可)"
  echo ""
  echo "--- Nginx エラーログ ---"
  sudo tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "  (読み取り不可)"
fi

# 結果 -------------------------------------------------------------------------------
echo ""
if [[ "$ALL_OK" == true ]]; then
  echo "========================================"
  echo "✅ すべて正常です"
  echo "========================================"
  exit 0
else
  echo "========================================"
  echo "⚠️  一部に問題があります"
  echo "========================================"
  exit 1
fi
