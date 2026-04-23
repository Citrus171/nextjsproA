#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/user/nestjsA_begin"
API_DIR="$ROOT/apps/api"

echo "== 1) DBコンテナ起動 =="
cd "$ROOT"
docker compose up -d

echo "== 2) API停止の注意 =="
echo "別ターミナルで npm run start:api を動かしている場合は Ctrl+C で停止してください。"

echo "== 3) Prisma reset (ローカルDB全削除) =="
cd "$API_DIR"
npx prisma migrate reset --force --skip-seed

echo "== 4) Seed投入 =="
cd "$ROOT"
npm run seed

echo "== 5) API起動 (バックグラウンド) =="
# すでに起動中なら失敗するので、必要なら手動起動に切り替えてください
nohup npm run start:api > /tmp/nestjs_api.log 2>&1 &

echo "== 6) 起動待ちと疎通確認 =="
for i in {1..20}; do
  if curl -sf "http://127.0.0.1:3000/api-json" > /dev/null; then
    echo "OK: API起動確認できました"
    break
  fi
  sleep 1
done

echo "== 完了 =="
echo "次: Schemathesis実行"
echo "schemathesis run http://localhost:3000/api-json --url http://localhost:3000 --phases examples --checks not_a_server_error --max-examples 25 --continue-on-failure"
