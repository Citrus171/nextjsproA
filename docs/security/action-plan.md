# セキュリティ対応アクションプラン

作成日: 2026-05-11  
ベース: `vulnerability-analysis.md` + コードベース直接監査（同日実施）

---

## VPS 本番環境 — コード修正不要の即時対応

コードのリリースを待たずに VPS 上で今すぐ対処できる項目。

### [VPS-1] JWT_SECRET がデフォルト値のまま ⚠️ 最優先

`.env` の `JWT_SECRET="change-me-in-production"` はリポジトリにコミットされた文字列。  
この値のまま本番稼働中の場合、**リポジトリ読み取り権限があれば誰でも任意ユーザーの JWT を偽造できる。**

```bash
# VPS で確認
grep JWT_SECRET /path/to/apps/api/.env

# 対処: 強いランダム値に差し替えてアプリ再起動
openssl rand -base64 48
```

変更後は全ユーザーの既存 JWT が無効になる（再ログインが必要）。

---

### [VPS-2] ENCRYPTION_KEY_V1 がリポジトリと同一

`.env` の `ENCRYPTION_KEY_V1="FpLTLpVR3g7m5re4LFlLgUKcZgRUJWv/4vBV6sXWLPM="` がリポジトリにコミットされている。  
同一の鍵で本番が動いている場合、**リポジトリアクセス者全員が DB の PII（メールアドレス等）を復号できる。**

```bash
grep ENCRYPTION_KEY_V1 /path/to/apps/api/.env
```

対処: `identity/key-versioning-migration.ts` の手順で鍵をローテーション。既存データの再暗号化が必要なため事前に手順を確認してから実施。

---

### [VPS-3] Swagger UI が認証なしで外部公開中

現コードは `NODE_ENV` に関わらず常に Swagger UI を有効化している。  
コード修正（項目 D）を待たずに **nginx で即時ブロック** できる。

```nginx
location = /api      { deny all; return 404; }
location = /api-json { deny all; return 404; }
```

---

### [VPS-4] NODE_ENV=production が設定されているか確認

未設定 or `"development"` の場合、スロットル制限が実質無効（1秒 10,000 req）になる。

```bash
printenv NODE_ENV
# または systemd の EnvironmentFile / docker-compose.yml を確認
```

`production` でなければ設定してアプリを再起動。

---

### [VPS-5] /api/health を外部 IP 制限

`HealthController` は認証なし・スロットルスキップ。DB 接続エラー時にホスト名等の接続情報が返る。

```nginx
location /api/health {
    allow 127.0.0.1;
    allow <監視サーバーIP>;
    deny all;
}
```

---

### [VPS-6] DB パスワードがデフォルト値のまま

`docker-compose.yml` に `POSTGRES_PASSWORD: postgres` / `PGADMIN_DEFAULT_PASSWORD: admin` がハードコード。

```bash
docker exec -it nestjs_db psql -U postgres \
  -c "ALTER USER postgres PASSWORD '<new-strong-password>';"
```

docker-compose.yml 側も環境変数経由に変更（コード修正 [L] と合わせて対応）。

---

### [VPS-7] 3000 番ポートの外部直接公開

nginx reverse proxy を介さず Node.js が `:3000` で外部公開されている場合、CORS 設定の問題が直接露出する。

```bash
ss -tlnp | grep 3000
```

直接公開されていればファイアウォールで遮断し nginx を挟む。

---

### VPS 作業チェックリスト

```
[ ] VPS-1: JWT_SECRET を強いランダム値に変更・再起動
[ ] VPS-2: ENCRYPTION_KEY_V1 がリポジトリ値と同一か確認・ローテーション計画
[ ] VPS-3: nginx で /api/api・/api/api-json をブロック
[ ] VPS-4: NODE_ENV=production を確認・設定
[ ] VPS-5: /api/health を nginx で IP 制限
[ ] VPS-6: DB パスワードをデフォルトから変更
[ ] VPS-7: 3000 番ポートの外部公開を nginx/ファイアウォールで遮断
```

---

## 推奨作業順

上から順に実施する。ただし以下の理由で一部入れ替えあり。

| ステップ | 項目 | 内容 | 備考 |
|----------|------|------|------|
| 1 | VPS-1 | JWT_SECRET を強いランダム値に変更・再起動 | 全ユーザー再ログイン発生 |
| 2 | VPS-3 | nginx で Swagger エンドポイントをブロック | コード修正 D の暫定措置 |
| 3 | VPS-4 | NODE_ENV=production を設定・再起動 | コード修正 D・E の前提 |
| 4 | VPS-5 | /api/health を nginx で IP 制限 | |
| 5 | VPS-6 | DB パスワードをデフォルトから変更 | コンテナ名: nestjs_db |
| 6 | VPS-7 | 3000 番ポートの外部公開を確認・遮断 | |
| - | VPS-2 | ENCRYPTION_KEY_V1 ローテーション | 手順設計後に別途実施 |
| 7 | B | 画像削除の isAdmin 漏れを修正・デプロイ | 2行修正、影響範囲が小さい |
| 8 | F | console.warn → Logger 置換・デプロイ | |
| 9 | D | Swagger を NODE_ENV で条件分岐・デプロイ | VPS-3 の nginx 設定を解除可能になる |
| 10 | J | ヘルスチェックの DB エラー詳細を除去・デプロイ | |
| 11 | E | CORS の !origin 許可・localhost 分岐を修正・デプロイ | 動作確認を慎重に |
| 12 | K | WebSocket JWT 検証間隔を 60s → 15s・デプロイ | |
| 13 | C | Helmet 導入・デプロイ | **dev で CSP 互換性テスト後** |
| 14 | A | npm audit fix・デプロイ | **dev で破壊的変更を確認後** |
| 15 | G | パスワード強度検証を追加 | 既存ユーザーへの移行戦略を別途検討 |
| 16 | H | JWT algorithms: ["HS256"] を4箇所に明示 | |
| 17 | I | JWT_REFRESH_SECRET をリフレッシュトークン署名に使用 | |
| 18 | L | docker-compose 認証情報を環境変数化 | |
| 19 | M | 画像 magic bytes 検証を追加 | sharp が後段にあるため緊急度低 |
| 20 | N | conversationId 形式検証（任意） | 脆弱性ではない。防御的実装として検討 |
| 21 | O | レート制限を Redis ストア化 | スケールアウト時に必要 |
| 22 | P | JWT_SECRET デフォルト値チェックを起動時に追加 | |

### 順番を変えた理由

| 変更 | 理由 |
|------|------|
| B を A より先に | B は2行の修正で影響範囲が明確。A（npm audit）は `--force` 時に破壊的変更の可能性があり dev テストが先に必要 |
| VPS-4 をコードデプロイより先に | `NODE_ENV=production` が未設定だと D（Swagger）・E（CORS）のコード修正が意図通りに動かない |
| C（Helmet）を E・A より後に | CSP ヘッダーが React フロントエンドのインラインスクリプト等を壊す可能性があり、dev での互換性確認が必要 |
| VPS-2 を保留 | 既存の暗号化済み PII データの再暗号化が必要。手順を設計してから実施 |

---

## 未対応一覧（優先度順）

### P0 — 今すぐ

#### [A] npm 依存関係の脆弱性 24件
`vulnerability-analysis.md` §1 参照。

```bash
npm audit fix
```

- critical 10件（Orval コードインジェクション、axios 複数）
- high 9件（bcrypt、lodash、fast-uri）
- `npm audit fix --force` が必要な場合は破壊的変更を個別確認

---

#### [B] 画像削除の認可チェック漏れ ← **既存文書未記載**
**ファイル**: `apps/api/src/posts/post.controller.ts:256-261`

`removeImage()` に `isAdmin` を渡していない。他の更新・削除エンドポイントはすべて `isAdmin` を渡しているが、この箇所だけ例外。現状、他ユーザーの投稿画像を削除できる。

```typescript
// 現在
return this.posts.removeImage(id, imageId, req.user.id);

// 修正後
const isAdmin = req.user?.role === "admin";
return this.posts.removeImage(id, imageId, req.user.id, isAdmin);
```

`post.service.ts` 側の `removeImage()` シグネチャも `isAdmin = false` を受け取るよう修正する。

---

### P1 — 1週間以内

#### [C] Helmet 未導入
`vulnerability-analysis.md` §3 参照。CSP / X-Frame-Options / HSTS 等が全て欠落。

```bash
npm install helmet --workspace=apps/api
```

```typescript
// apps/api/src/main.ts
import helmet from "helmet";
app.use(helmet());
```

---

#### [D] Swagger UI 本番公開
`vulnerability-analysis.md` §2 参照。

```typescript
if (process.env.NODE_ENV !== "production") {
  SwaggerModule.setup("api", app, document);
}
```

---

#### [E] CORS 設定の2つの問題
`vulnerability-analysis.md` §4 に localhost 分岐の指摘あり。追加で `!origin` 許可の問題も存在。

**問題1**: `!origin`（curl / モバイルアプリ等）を無条件許可 → `credentials: true` と組み合わさって CSRF 攻撃に悪用可能  
**問題2**: `NODE_ENV` チェックなしで全 localhost ポートを許可

```typescript
// apps/api/src/main.ts
const isDev = process.env.NODE_ENV !== "production";

app.enableCors({
  origin: (origin, cb) => {
    if (!origin) {
      // 本番では origin なしリクエストを拒否
      return isDev ? cb(null, true) : cb(new Error("Not allowed by CORS"));
    }
    if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
    if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  // ...
});
```

---

#### [F] console.warn → Logger 置換
`vulnerability-analysis.md` §5 参照。

```typescript
// apps/api/src/conversations/conversations.gateway.ts
private readonly logger = new Logger(ConversationsGateway.name);
// ...
this.logger.warn("Gateway JWT expired", { userId });
```

---

### P2 — 2週間以内

#### [G] パスワード強度検証不足 ← **既存文書未記載**
**ファイル**: `apps/api/src/auth/dto/register.dto.ts`

現状は `@MinLength(8)` のみ。"password", "12345678" が通る。

```typescript
@IsStrongPassword({
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
})
password: string;
```

既存ユーザーへの影響（移行戦略）を別途検討。

---

#### [H] JWT アルゴリズム未ピン留め
`vulnerability-analysis.md` インジェクション監査参照。

現在 HS256 のみで実害はないが、将来の鍵ローテーション・非対称鍵追加時にアルゴリズム混乱攻撃が成立する。

対象4箇所すべてに `algorithms: ["HS256"]` を明示：

```typescript
// jwt.strategy.ts
new Strategy({ secretOrKey: ..., algorithms: ["HS256"] })

// identity.module.ts / conversation.module.ts
JwtModule.registerAsync({
  useFactory: (config) => ({
    secret: config.getOrThrow("JWT_SECRET"),
    signOptions: { expiresIn: "15m" },
    verifyOptions: { algorithms: ["HS256"] },
  }),
})

// conversations.gateway.ts
this.jwtService.verify<JwtPayload>(token, { algorithms: ["HS256"] })
```

---

#### [I] JWT_REFRESH_SECRET 未使用
`vulnerability-analysis.md` §9 参照。

アクセストークンとリフレッシュトークンで同一の `JWT_SECRET` を使用中。リフレッシュトークン専用の鍵を分離する。

`identity.module.ts` でリフレッシュトークン署名・検証時に `JWT_REFRESH_SECRET` を使う実装に変更。

---

#### [J] ヘルスチェックの DB エラー詳細露出 ← **既存文書未記載**
**ファイル**: `apps/api/src/health/prisma-health.indicator.ts:23`

```typescript
// 現在: DBホスト名・接続情報が /api/health に返る可能性
this.getStatus(key, false, { message: (e as Error).message })

// 修正後
this.getStatus(key, false)
```

---

#### [K] WebSocket JWT 検証ギャップ ← **既存文書未記載**
**ファイル**: `apps/api/src/conversations/conversations.gateway.ts:52`

60秒ごとの再検証により、トークン失効後最大59秒間 WebSocket 通信が継続可能。

```typescript
// 60000 → 15000 に短縮
}, 15000);
```

---

### P3 — 1ヶ月以内

#### [L] docker-compose 認証情報ハードコード
`vulnerability-analysis.md` §6 参照。

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

---

#### [M] 画像 MIME タイプ — magic bytes 検証
`vulnerability-analysis.md` §8 参照。

現状は `file.mimetype`（クライアント申告値）のみ確認。`file-type` パッケージで magic bytes を検証して多層防御にする。後段に sharp があるため緊急度は低。

---

### P4 — 継続的改善

#### [N] WebSocket `conversationId` フォーマット検証

`joinConversation` / `leaveConversation` の `conversationId` は形式検証がないが、Prisma のパラメータ化クエリでのみ使用されるため SQL インジェクション・パストラバーサルには繋がらない。不正な ID は `findOneForUser` が null を返して切断するだけ。防御的実装としての追加は任意。

---

#### [O] レート制限 Redis ストア化
`vulnerability-analysis.md` §7 参照。スケールアウト時に必要。

#### [P] JWT_SECRET デフォルト値チェック
`vulnerability-analysis.md` §10 参照。起動時に `change-me-in-production` を含む場合は production で起動を拒否するガードを追加。

---

## 対応状況トラッキング

| ID | 項目 | 優先度 | 状態 | 担当 |
|----|------|--------|------|------|
| A | npm audit fix | P0 | ✅ 対応済 (PR#253) | - |
| B | 画像削除 isAdmin 漏れ | P0 | ✅ 対応済 (PR#253) | - |
| C | Helmet 導入 | P1 | ✅ 対応済 (PR#254) | - |
| D | Swagger 本番無効化 | P1 | ✅ 対応済 (PR#253) | - |
| E | CORS 修正（2点） | P1 | ✅ 対応済 (PR#254) | - |
| F | console.warn → Logger | P1 | ✅ 対応済 (PR#253) | - |
| G | パスワード強度 | P2 | ✅ 対応済 (PR#255) | - |
| H | JWT algorithms ピン留め | P2 | ✅ 対応済 (PR#255) | - |
| I | JWT_REFRESH_SECRET 分離 | P2 | N/A（opaque token 実装済み） | - |
| J | ヘルスチェック情報漏洩 | P2 | ✅ 対応済 (PR#253) | - |
| K | WebSocket JWT 検証間隔 | P2 | ✅ 対応済 (PR#254) | - |
| L | docker-compose 認証情報 | P3 | 未対応 | - |
| M | 画像 magic bytes 検証 | P3 | 未対応 | - |
| N | conversationId 形式検証（任意） | P4 | 未対応 | - |
| O | Redis ストア化 | P4 | 未対応 | - |
| P | JWT_SECRET デフォルト検知 | P4 | 未対応 | - |

---

---

## 参照

- `docs/security/vulnerability-analysis.md` — 元の監査レポート（2026-05-11）
- `docs/matrices/authorization.md` — 権限マトリクス
