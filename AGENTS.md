# AGENTS.md

Kilo エージェント用プロジェクトガイダンス。CLAUDE.md と内容は共通だが、並列タスク競合回避ルールの参照先が異なる。

## 構成

npm workspaces モノレポ。3つのパッケージで構成される。

- `apps/api` — NestJS + Prisma + OpenAPI (port 3000)
- `apps/web` — React + Vite + TanStack Query (port 5173)
- `packages/api-client` — Orval で OpenAPI から自動生成した axios クライアント

## よく使うコマンド

すべてルートから実行可能。

```bash
# 開発サーバー起動
npm run start:api        # API (port 3000)
npm run start:web        # Web (port 5173)

# DB
docker compose up -d     # PostgreSQL + pgAdmin を起動
npm run prisma:migrate   # マイグレーション実行
npm run prisma:generate  # Prisma Client 再生成

# テスト
npm run test             # API の Jest テスト (apps/api/src/**/*.spec.ts)
npm run test:e2e         # Web の Playwright テスト

# 単一テストファイルの実行
cd apps/api && npx jest src/posts/post.service.spec.ts

# api-client 再生成フロー（API 起動中に実行）
npm run openapi          # openapi.json を apps/api から取得
npm run generate         # Orval で packages/api-client/src/index.ts を生成

# 型チェック / lint
npm run typecheck:api
npm run typecheck:web
npm run lint:api
```

## アーキテクチャ

### API (apps/api)

NestJS の標準モジュール構成。各機能は `コントローラ / サービス / DTO` の3層。

- `auth` — JWT アクセストークン（Bearer）+ Refresh Token（HttpOnly Cookie）。`JwtAuthGuard` を付けたルートは認証必須。
- `users` — ユーザー管理。パスワードは bcrypt ハッシュ。
- `posts` — 投稿 CRUD。画像アップロード（multer）対応。
- `map` — 埼玉の地図データ API。
- `PrismaService` — グローバルシングルトン。

DB スキーマ: `apps/api/prisma/schema.prisma`（User / Post / RefreshToken）

### Web (apps/web)

- React Router v6。`/create`, `/edit/:id`, `/saitama-map` は PrivateRoute。
- API 呼び出し: `packages/api-client` の自動生成クライアントを使用。
- データフェッチ: TanStack Query。

## 並列タスク競合回避

Kilo と Claude Code の並列作業時にファイル編集競合を防ぐため、以下のルールに従う。

### タスク開始時（必須）

**すべての実装タスクにおいて、コード変更前に必ず以下を実行すること。**

1. `docs/tasks/agent-kilocode.md` に `## [IN_PROGRESS] タスク名` セクションを追記し、`編集予定ファイル` をリストアップする
2. `docs/tasks/agent-claude.md` を読み込み、`## [IN_PROGRESS]` セクションがあれば `編集予定ファイル` を確認する
3. 自身の `編集予定ファイル` と相手の `編集予定ファイル` に重複がある場合:
   - タスクを開始せず、`## [BLOCKED]` として記録し、`衝突ファイル` を明示する
   - 競合が解消されるまで待機する

### タスク終了時

- `[IN_PROGRESS]` → `[DONE]` または `[FAILED]` に更新
- 終了時刻と実際の `編集ファイル` を記録する

### タスクエントリのフォーマット

```markdown
## [IN_PROGRESS] タスク名

- 開始: YYYY-MM-DD HH:MM
- 編集予定ファイル:
  - `path/to/file.ts`

## [DONE] タスク名

- 開始: YYYY-MM-DD HH:MM
- 終了: YYYY-MM-DD HH:MM
- 状態: DONE
- コミット: `abc1234`
- PR: #123
- 編集ファイル:
  - `path/to/file.ts`
```

## テスト方針

- API: Jest + ts-jest。ファイル命名 `*.spec.ts`（ユニット）、`*.e2e.ts`（E2E）
- Web: Vitest（ユニット）+ Playwright（E2E）
- 変更には必ずテストを書くか既存テストを更新する

## エラーメッセージ

- API のエラーメッセージは**日本語**に統一する。

## 型安全

- `any` は原則禁止。

## Git ワークフロー

- ブランチ命名: `feat/issue{number}/{description}`
- コミット: Conventional Commits

## Notes

### テスト一覧ファイルの更新

テストコードを追加・変更・削除した後は、必ず以下の2つのファイルを最新の状態に更新すること。

- `tests/TESTS.md` — チェックボックス付きリスト形式
- `tests/TESTS_TREE.md` — ツリー形式
