# API レスポンス／エラー規約

Status: **Authoritative** — 2026-05-09 確定

---

## 1. エラーレスポンスエンベロープ

### 規約（確定）

```jsonc
// 通常エラー
{
  "statusCode": 404,
  "code": "E_POST_NOT_FOUND",
  "message": "投稿が見つかりません"
}

// バリデーション失敗時のみ details を追加
{
  "statusCode": 400,
  "code": "E_VALIDATION",
  "message": "入力値が不正です",
  "details": [{ "field": "title", "message": "タイトルは必須です" }]
}
```

**フィールド定義：**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `statusCode` | integer | ✅ | HTTP ステータスコードと同値 |
| `code` | string | ✅ | エラーコード（後述）。未定義時は `"E_UNKNOWN"` |
| `message` | string | ✅ | 日本語エラーメッセージ（UI 表示用） |
| `details` | array | — | バリデーションエラー詳細。通常は省略 |

**実装方針：** `AllExceptionsFilter` でレスポンスを統一変換する。

**NG 例**
```jsonc
// NG: message にオブジェクトを入れる
{ "statusCode": 401, "message": { "error": "..." } }

// NG: 英語メッセージ
{ "statusCode": 404, "message": "Post not found" }

// NG: NestJS デフォルトの error フィールドをそのまま返す
{ "statusCode": 404, "message": "...", "error": "Not Found" }

// NG: details を null で返す（フィールドごと省略すること）
{ "statusCode": 400, "code": "E_VALIDATION", "message": "...", "details": null }
```

---

## 2. HTTP ステータスコード対応表

| ステータス | 使用シーン | NestJS 例外クラス | 現状の使用例 |
|-----------|-----------|-------------------|-------------|
| 200 | 取得・更新・ログイン成功 | — (`@HttpCode(200)`) | `POST /auth/login`, `POST /auth/refresh` |
| 201 | リソース作成成功 | — (NestJS デフォルト) | `POST /conversations` |
| 400 | リクエスト不正（バリデーション失敗・ビジネスルール違反） | `BadRequestException` | ファイルサイズ超過, 月間投稿数上限 |
| 401 | 未認証（トークン無効・未提供） | `UnauthorizedException` | ログイン失敗, リフレッシュトークン無効 |
| 403 | 認証済みだが権限不足・所有者でない | `ForbiddenException` | 他人の投稿操作, 管理者専用操作, プラン制限 |
| 404 | リソースが存在しない | `NotFoundException` | 投稿・会話・画像・ユーザーが見つからない |
| 409 | 重複（一意制約違反） | `ConflictException` | メールアドレス重複 (P2002) |
| 422 | 使用しない（バリデーション失敗は 400 に統一） | — | 未使用 |
| 429 | レート制限超過 | `ThrottlerException` | `ThrottlerGuard` |
| 500 | サーバー内部エラー | — | Sentry に送信 |

### 400 と 403 の判断基準

エラーの原因を「認可ルール」と「ドメインルール」で分類すると判断しやすい。

**認可ルール違反 → 403**  
「誰がそれを実行できるか」の制約。認証情報が変わると結果も変わる。

```
「他人のリソースを操作しようとしている」      → 403
「プランの制限に引っかかった」               → 403
「管理者専用の操作を一般ユーザーが実行しようとしている」→ 403
```

**ドメインルール違反 → 400**  
「その状態で操作が成立するか」の制約。誰が実行しても結果は変わらない。

```
「既に resolved 済みの投稿に画像を追加しようとしている」→ 400
「バリデーション失敗」                               → 400
「ファイルサイズが上限を超えている」                  → 400
```

**簡易判定フロー**

```
「認証なしで同じリクエストを送っても意味がない」→ 403
「認証があっても無効なデータを送っている」      → 400
「認証があっても他人のリソースを触ろうとしている」→ 403
「プランの制限に引っかかった」                → 403
```

月間投稿数上限は `403`（プラン権限の問題のため）。

---

## 3. エラーコード体系

形式: `E_{DOMAIN}_{DESCRIPTION}`

| コード | HTTP | メッセージ |
|--------|------|-----------|
| `E_AUTH_INVALID_CREDENTIALS` | 401 | 認証情報が正しくありません |
| `E_AUTH_INVALID_REFRESH_TOKEN` | 401 | 無効なリフレッシュトークンです |
| `E_AUTH_NO_REFRESH_TOKEN` | 401 | リフレッシュトークンがありません |
| `E_AUTH_REQUIRED` | 401 | 認証が必要です |
| `E_AUTH_ADMIN_REQUIRED` | 403 | 管理者権限が不足しています |
| `E_AUTH_DUPLICATE_NICKNAME` | 409 | このニックネームはすでに使用されています |
| `E_AUTH_DUPLICATE_EMAIL` | 409 | このメールアドレスはすでに使用されています |
| `E_POST_NOT_FOUND` | 404 | 投稿が見つかりません |
| `E_POST_NOT_OWNER` | 403 | 投稿のオーナーではありません |
| `E_POST_PLAN_LIMIT` | 403 | 無料プランの月間投稿数上限に達しています |
| `E_POST_PET_DETAIL_REQUIRED` | 400 | petDetailを新規作成する場合、name/color/age/featuresは必須です |
| `E_POST_LOCATION_REQUIRED` | 400 | locationを新規作成する場合、prefecture/city/address/lat/lngは必須です |
| `E_POST_IMAGE_LIMIT` | 403 | このプランでは画像は上限枚数を超えています |
| `E_POST_LOST_DATE_REQUIRED` | 400 | lostDateは必須です |
| `E_POST_SELF_FAVORITE` | 403 | 自分の投稿はお気に入りできません |
| `E_POST_FAVORITE_LIMIT` | 400 | お気に入りは20件までです |
| `E_POST_IMAGE_NOT_FOUND` | 404 | 画像が見つかりません |
| `E_POST_RESOLVED_IMAGE` | 400 | 解決済みの投稿には画像を追加できません |
| `E_USER_NOT_FOUND` | 404 | ユーザーが見つかりません |
| `E_USER_NICKNAME_REQUIRED` | 400 | ニックネームは必須です |
| `E_CONV_NOT_FOUND` | 404 | 会話が見つかりません |
| `E_CONV_NOT_PARTICIPANT` | 403 | この会話を閲覧する権限がありません |
| `E_CONV_CREATE_FORBIDDEN` | 403 | 会話を開始できるのは投稿者または目撃者のみです |
| `E_CONV_MESSAGE_FORBIDDEN` | 403 | この会話にメッセージを送る権限がありません |
| `E_CONV_CONTENT_REQUIRED` | 400 | メッセージ本文または画像のいずれかは必須です |
| `E_CONV_CONTENT_TOO_LONG` | 400 | メッセージは1000文字以内で入力してください |
| `E_CONV_SIGHTING_NOT_LINKED` | 404 | 指定された投稿に紐づく目撃情報ではありません |
| `E_SIGHTING_NOT_FOUND` | 404 | 目撃情報が見つかりません |
| `E_SIGHTING_SELF_CREATE` | 403 | 投稿者本人はSightingを作成できません |
| `E_SIGHTING_NOT_OWNER` | 403 | 削除できるのは本人のみです |
| `E_SIGHTING_SELF_FAVORITE` | 403 | 自分の目撃情報はお気に入りできません |
| `E_SIGHTING_FAVORITE_LIMIT` | 400 | お気に入りは20件までです |
| `E_SIGHTING_POST_ID_REQUIRED` | 400 | postIdは必須です |
| `E_FILE_INVALID_ID` | 400 | 不正なIDです |
| `E_FILE_INVALID_PATH` | 400 | 不正なファイルパスです |
| `E_FILE_SIZE_EXCEEDED` | 400 | ファイルサイズが上限を超えています |
| `E_FILE_UNSUPPORTED_TYPE` | 400 | 未対応のファイル形式です |
| `E_IMAGE_PROCESSING_ERROR` | 400 | 画像処理に失敗しました |
| `E_RESOURCE_NOT_FOUND` | 404 | リソースが見つかりません（Prisma P2025） |
| `E_RESOURCE_DUPLICATE` | 409 | リソースが重複しています（Prisma P2002） |
| `E_RATE_LIMIT` | 429 | リクエストが多すぎます。しばらく待ってから再試行してください |
| `E_VALIDATION` | 400 | 入力値が不正です |
| `E_INTERNAL` | 500 | 内部サーバーエラーが発生しました |

---

## 4. 日本語メッセージ規約

### 文体

| ルール | 例（OK） | 例（NG） |
|--------|---------|---------|
| 体言止め（名詞で終わる） | 「投稿が見つかりません」 | 「投稿が見つかりませんでした」 |
| 敬体禁止（です・ます禁止） | 「認証情報が正しくありません」 | 「認証情報が正しくありませんでした」 |
| 句読点なし | 「リフレッシュトークンがありません」 | 「リフレッシュトークンがありません。」 |
| 英語混在禁止 | 「投稿のオーナーではありません」 | 「Post の owner ではありません」 |

### 修正済み対象

以下は規約違反のため修正する（#232 実装時に対応）：

| 現状 | 修正後 |
|------|--------|
| `"この操作には管理者権限が必要です"` | `"管理者権限が不足しています"` |
| `"ファイルサイズは2MB以内にしてください"` | `"ファイルサイズが上限を超えています（最大2MB）"` |

---

## 5. ページング規約

### 現状

オフセットページング（`page` / `perPage`）を採用。レスポンス形状：

```jsonc
{
  "items": [...],
  "total": 120
}
```

クエリパラメータ: `GET /posts?page=1&perPage=10`

### 規約

オフセット方式で継続する。

| パラメータ | 型 | デフォルト | 最大値 |
|-----------|-----|-----------|--------|
| `page` | integer | 1 | — |
| `perPage` | integer | 10 | 100 |

レスポンス必須フィールド:
```jsonc
{
  "items": [],
  "total": 0       // 総件数（UIのページネーション表示用）
}
```

**NG 例**
```jsonc
// NG: total なしで items だけ返す
{ "data": [...] }

// NG: パラメータ名のゆれ
GET /posts?pageNo=1&pageSize=10
```

---

## 6. 日付・タイムゾーン規約

### 現状

- Prisma が返す `Date` 型をそのまま JSON シリアライズ → ISO8601 形式になる
- フロントエンドは axios が受け取った時点で文字列

### 規約

- すべての日付フィールドは **ISO8601 UTC 文字列**（例: `"2026-05-08T12:00:00.000Z"`）
- `Date` 型のまま返すと NestJS の JSON 変換で自動変換されるため許容
- DTO の `@ApiProperty` には `{ type: String, format: 'date-time' }` を明記

---

## 7. Controller / Service の責務分担

**Controller の責務（ここだけ）**

- リクエストの受信・パラメータの取り出し
- Service の呼び出し
- レスポンスの返却・HTTP ステータスの指定

**Controller に書いてはいけないもの**

```typescript
// NG: Controller でビジネスロジック
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
  const post = await this.prisma.post.findUnique({ where: { id } });
  if (post.userId !== user.id) throw new ForbiddenException('...');  // NG
  return this.prisma.post.update({ ... });                            // NG
}

// OK: Controller は薄く保つ
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdatePostDto, @Req() req) {
  return this.postsService.update(id, dto, req.user.id);
}
```

**Service の責務**

- ビジネスロジック
- 認可チェック（所有者確認・プラン制限）
- ドメインルールの検証（状態チェック）
- Prisma 操作

```typescript
// OK: Service で認可とドメインルールを両方チェック
async update(id: string, dto: UpdatePostDto, userId: string) {
  const post = await this.prisma.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundException('投稿が見つかりません');
  if (post.userId !== userId) throw new ForbiddenException('投稿のオーナーではありません');  // 認可ルール
  if (post.status === 'resolved') throw new BadRequestException('解決済みの投稿は編集不可です');  // ドメインルール
  return this.prisma.post.update({ where: { id }, data: dto });
}
```

---

## 8. レート制限

### スロット定義（本番環境）

| スロット名 | TTL | 上限 | 適用エンドポイント |
|-----------|-----|------|-----------------|
| `default` | 60秒 | 300回 | 全エンドポイント（デフォルト） |
| `login` | 15分 | 5回 | `POST /auth/login`（`@Throttle({ login: {} })`） |
| `register` | 1時間 | 3回 | `POST /users/register`（`@Throttle({ register: {} })`） |
| `public` | 60秒 | 120回 | 公開エンドポイント（`public` スロット適用時） |

開発環境では全スロット `ttl: 1s / limit: 10,000`（実質無制限）。

### 実装位置

- 設定: `apps/api/src/app.module.ts`（`ThrottlerModule.forRoot`）
- Guard: `apps/api/src/auth/throttler.guard.ts`（`AppThrottlerGuard`）
- `login` / `register` は `@Throttle()` で明示したルートのみに適用される（オプトイン方式）

---

## 9. セキュリティ共通規約

### Swagger UI の本番無効化

Swagger UI は `NODE_ENV !== "production"` の場合のみ有効化する。本番環境では API 仕様の露出を防ぐため無効化する。

```typescript
// apps/api/src/main.ts
const document = SwaggerModule.createDocument(app, config);
if (process.env.NODE_ENV !== "production") {
  SwaggerModule.setup("api", app, document);
}
```

### セキュリティヘッダー (Helmet)

本番環境では Helmet ミドルウェアを適用し、以下のセキュリティヘッダーを付与する。

| ヘッダー | 防御する攻撃 |
|----------|-------------|
| `Content-Security-Policy` | XSS, データインジェクション |
| `X-Frame-Options` | Clickjacking |
| `X-Content-Type-Options` | MIME sniffing |
| `Strict-Transport-Security` | プロトコルダウングレード |

```typescript
// apps/api/src/main.ts
import helmet from "helmet";
app.use(helmet());
```

### ヘルスチェックの情報露出防止

`/api/health` のヘルスチェックエンドポイントは、DB 接続エラー時にもホスト名・接続情報等の内部詳細をレスポンスに含めない。`getStatus(key, false)` で最低限の情報のみ返す。

### CORS 設定

CORS は `apps/api/src/common/cors.ts` で一元管理する。本番環境では `allowedOrigins` に `WEB_ORIGIN` 環境変数のみを含める。Origin ヘッダーなしリクエスト（サーバー間通信・ヘルスチェック）は許可する。

---

## 10. その他の共通規約

### 空配列

リストが空の場合は `null` ではなく `[]` を返す。

---

## 付録: 実装ガイド

### 例外の投げ方

```typescript
// OK: 文字列のみ
throw new NotFoundException("投稿が見つかりません");

// NG: オブジェクト渡し
throw new NotFoundException({ error: "投稿が見つかりません" });
```

### PrismaClientExceptionFilter

`P2025`（レコードなし）→ 404、`P2002`（一意制約）→ 409 に変換済み。  
その他の Prisma エラーは 500 として再スローされる（Sentry に送信）。

---

## 11. 型安全規約

tsconfig 設定・フラグ管理方針は [`docs/conventions/tsconfig.md`](./tsconfig.md) を参照。

---

## 12. ESLint 型安全ルール

### 12.1 有効化ルール（本番コード `src/**/*.ts`）

| ルール | 値 | 説明 |
|--------|-----|------|
| `@typescript-eslint/no-unsafe-assignment` | `error` | `any` 値の代入禁止 |
| `@typescript-eslint/no-unsafe-member-access` | `error` | `any` 値のプロパティアクセス禁止 |
| `@typescript-eslint/no-unsafe-call` | `error` | `any` 値の呼び出し禁止 |
| `@typescript-eslint/no-unsafe-return` | `error` | `any` 値の return 禁止 |
| `@typescript-eslint/no-unsafe-argument` | `error` | `any` 値の引数渡し禁止 |
| `@typescript-eslint/no-floating-promises` | `error` | 既存 |
| `@typescript-eslint/no-explicit-any` | `error` | 既存 |

テストコード (`src/**/*.spec.ts`) では上記 `no-unsafe-*` は無効（mock で `any` が不可避なため）。

### 12.2 入力検証規約

- `@Query()` パラメータは DTO で検証する。数値パラメータには上限を設定する
  - `perPage`: 最大 100（DoS 防止）
- `@Param("id")` は UUID 形式の検証を推奨（`@IsUUID()`）
- WebSocket の `@MessageBody()` も class-validator で検証する

### 12.3 ログ出力規約

- ログに PII（個人情報）を出力しない
  - メールアドレス、パスワード、トークンはログ不可
- 認証ログは `userId` のみ出力し、メールアドレス等は含めない
- デバッグ用途の `console.log` は使用せず、Pino ロガーを使用する

---

*このドキュメントは `apps/api` の設計規約。変更時は PR に規約更新を含めること。*
