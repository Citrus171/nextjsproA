# k6 Performance Tests

VPS（2 vCPU / 2GB RAM）を対象とした負荷テスト。

## 前提

- [k6](https://k6.io/docs/get-started/installation/) のインストール
- API サーバー起動中（`npm run start:api`）
- シードデータ投入済み（`npm run seed`）

## 実行

```bash
# ローカル（デフォルト localhost:3000）
k6 run tools/k6/main.js

# ステージング環境を対象にする場合
k6 run --env BASE_URL=https://api.example.com tools/k6/main.js

# 特定シナリオのみ（デバッグ用）
k6 run --env BASE_URL=http://localhost:3000 \
       --scenario posts \
       tools/k6/main.js
```

## SLO（合否基準）

| メトリクス            | 閾値    |
| --------------------- | ------- |
| エラー率              | < 1%    |
| p95 読み取り系        | < 300ms |
| p95 auth / 書き込み系 | < 800ms |

## シナリオ構成

| シナリオ  | 最大 VU | 対象エンドポイント                         |
| --------- | ------- | ------------------------------------------ |
| health    | 2       | GET /api/health                            |
| auth      | 10      | POST /api/auth/login, refresh, logout      |
| posts     | 100     | GET /api/posts, GET /api/posts/:id         |
| sightings | 20      | GET /api/sightings, GET /api/sightings/:id |
| map       | 10      | GET /api/map/markers                       |

## CI

`.github/workflows/perf.yml` で毎日 JST 03:00 に自動実行。
手動実行は GitHub Actions の "workflow_dispatch" から。
結果はアーティファクト（`k6-results-{run_id}`）に 30 日間保存。
