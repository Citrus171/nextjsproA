#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/user/nestjsA_begin"
BASE_URL="http://127.0.0.1:3000"
SCHEMA_PATH="packages/api-client/openapi.json"
EMAIL="seed-admin@finder.miyaoo.test"
PASSWORD="Password123!"

cd "$ROOT"

if ! curl -sf "$BASE_URL/api-json" >/dev/null; then
  echo "APIが起動していません: $BASE_URL"
  echo "先に 'npm run start:api' を実行してください。"
  exit 1
fi

TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))")

if [[ -z "$TOKEN" ]]; then
  echo "トークン取得に失敗しました。seedデータと認証情報を確認してください。"
  exit 2
fi

echo "Schemathesisを実行します..."
schemathesis run "$SCHEMA_PATH" \
  --url "$BASE_URL" \
  --phases examples \
  --checks not_a_server_error \
  --max-examples 25 \
  --continue-on-failure \
  --exclude-path /api/auth/login \
  --seed 20260423 \
  --generation-deterministic \
  -H "Authorization: Bearer $TOKEN"
