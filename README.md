# NestJS + Prisma + React (TanStack Query) monorepo scaffold

このリポジトリは以下の構成を持つサンプルモノレポです。

構成:

- apps/api: NestJS + Prisma + OpenAPI (Swagger)
- apps/web: React + Vite + TanStack Query
- packages/api-client: Orval OpenAPI クライアント生成設定
- infra/ci: GitHub Actions ワークフロー

主要なコマンド例:

```bash
# API の依存をインストールして Prisma マイグレーション
cd apps/api
npm install
npx prisma migrate dev --name init

# API を起動
npm run start:dev

# Web を起動
cd ../apps/web
npm install
npm run dev
```

各パッケージの README を参照してください。

## テスト戦略（推奨）

このリポジトリでは次の3段構えを推奨します。

- Jest API: 実装ロジックの回帰防止
- Dredd: OpenAPI 契約テスト
- Schemathesis: 異常系・境界値の探索（fuzz）

### ローカル実行

```bash
# API テスト
npm run test:api

# 契約テスト（Dredd）
npm run test:contract

# API + 契約テストを連続実行
npm run test:ci
```

Schemathesis は重いため、通常は nightly または手動実行を推奨します。

```bash
# 例: ローカルで Schemathesis を直接実行
python -m pip install schemathesis
schemathesis run http://localhost:3000/api-json --base-url http://localhost:3000 --checks not_a_server_error
```
