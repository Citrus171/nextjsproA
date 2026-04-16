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
