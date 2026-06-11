# syntax=docker/dockerfile:1
# API (NestJS + Prisma) 本番風イメージ
# ビルドコンテキストはリポジトリルート:
#   docker build -f apps/api/Dockerfile .

# ---------- build: 全依存インストール + Prisma generate + tsc ビルド ----------
# migrate サービスはこのステージを target 指定で使う（prisma CLI + migrations が必要なため）
FROM node:22-slim AS build
ENV HUSKY=0
WORKDIR /app

# bcrypt / sharp のプリビルドが取得できない場合のソースビルド用ツール
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ openssl && \
    rm -rf /var/lib/apt/lists/*

# package.json 群を先にコピーして npm ci をレイヤーキャッシュさせる
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
RUN npm ci

COPY apps/api ./apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma && \
    npm run build --workspace=apps/api

# ---------- prod-deps: 本番依存のみインストール ----------
FROM node:22-slim AS prod-deps
ENV HUSKY=0
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ openssl && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
# husky(devDep) の prepare スクリプトは本番依存のみの環境では実行不能なため除去
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

# ---------- runtime: 実行のみ ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Prisma エンジンが OpenSSL を必要とする
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# workspaces のホイスト衝突で依存が root と apps/api/node_modules に分散するため
# prod-deps の /app ツリーごとコピーする（package.json 群も含まれる）
COPY --from=prod-deps /app /app
# prisma generate で生成したクライアント実体を上書きコピー
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/apps/api/dist ./apps/api/dist

# multer の保存先（compose / k8s では volume をマウントする）
RUN mkdir -p /app/apps/api/uploads && chown -R node:node /app/apps/api/uploads

USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
