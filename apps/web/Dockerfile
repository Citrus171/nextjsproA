# syntax=docker/dockerfile:1
# Web (React + Vite) 本番風イメージ
# ビルドコンテキストはリポジトリルート:
#   docker build -f apps/web/Dockerfile .
#
# Web は相対パス（/api, /uploads, /socket.io）で API を呼ぶため、
# nginx で静的配信しつつ同一オリジンで API へリバースプロキシする（nginx.conf 参照）。
# k8s では Ingress がこのプロキシの役割を担う。

# ---------- build: Vite ビルド ----------
FROM node:22-slim AS build
ENV HUSKY=0
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
RUN npm ci

# web は packages/api-client の TS ソースを直接 import している
COPY packages/api-client ./packages/api-client
COPY apps/web ./apps/web
RUN npm run build --workspace=apps/web

# ---------- runtime: nginx で静的配信 + API プロキシ ----------
FROM nginx:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
# ベースイメージの CMD と同一だが、起動方法を Dockerfile 単体で読めるよう明示する
CMD ["nginx", "-g", "daemon off;"]
