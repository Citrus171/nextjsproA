# Claude Code タスクログ

## [DONE] issue#252 セキュリティ修正 P2（G/H）
- 開始: 2026-05-11 13:00
- 終了: 2026-05-11 13:30
- 状態: DONE
- コミット: `00438c70`
- PR: #255
- 編集ファイル:
  - `apps/api/src/users/dto/register.dto.ts`
  - `apps/api/src/auth/jwt.strategy.ts`
  - `apps/api/src/identity/identity.module.ts`
  - `apps/api/src/conversations/conversation.module.ts`
  - `apps/api/src/conversations/conversations.gateway.ts`
  - `apps/api/src/users/dto/register.dto.spec.ts`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 追加テスト: 8件（パスワード強度バリデーション）
- 備考: [I] は opaque token 実装済みのため対象外

## [DONE] issue#251 セキュリティ修正 P1-P2
- 開始: 2026-05-11 12:25
- 終了: 2026-05-11 12:47
- 状態: DONE
- コミット: `436ed5cf`
- PR: #254（作成予定）
- 編集ファイル:
  - `apps/api/src/main.ts`
  - `apps/api/src/common/cors.ts`（新規）
  - `apps/api/src/common/cors.spec.ts`（新規）
  - `apps/api/src/conversations/conversations.gateway.ts`
  - `apps/api/src/conversations/conversations.gateway.spec.ts`
  - `apps/api/package.json`（helmet 追加、npm audit fix）
  - `apps/web/package.json`（npm audit fix）
  - `package-lock.json`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 追加テスト: 9件（cors.spec.ts 8件 + gateway 定期JWT検証インターバル確認 1件）
- 更新テスト: 2件（gateway 定期JWT検証 60000ms→15000ms）

## [DONE] issue#250 セキュリティ修正 P0-P1
- 開始: 2026-05-11 12:10
- 終了: 2026-05-11 12:15
- 状態: DONE
- コミット: `378065c9`
- PR: #253
- 編集ファイル:
  - `apps/api/src/posts/post.service.ts`
  - `apps/api/src/posts/post.service.spec.ts`
  - `apps/api/src/posts/post.controller.ts`
  - `apps/api/src/posts/post.controller.spec.ts`
  - `apps/api/src/conversations/conversations.gateway.ts`
  - `apps/api/src/main.ts`
  - `apps/api/src/health/prisma-health.indicator.ts`
  - `apps/api/src/health/prisma-health.indicator.spec.ts`（新規）
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 追加テスト: 5件（removeImage admin 2件 + PrismaHealthIndicator 3件）
- 更新テスト: post.controller.spec.ts 1件（removeImage 期待値更新）

## [DONE] docs/設計書一括修正
- 開始: 2026-05-10 00:00
- 終了: 2026-05-10 00:30
- 状態: DONE
- 編集ファイル:
  - `docs/adr/0001-jwt-bearer-refresh-cookie.md`
  - `docs/adr/0002-orval-api-client.md`
  - `docs/adr/0003-email-hmac-hash.md`
  - `docs/adr/0004-no-repository-layer.md`（新規）
  - `docs/adr/0005-no-cqrs.md`（新規）
  - `docs/adr/0006-no-domain-events.md`（新規）
  - `docs/adr/0007-no-result-type.md`（新規）
  - `docs/conventions/api-conventions.md`
  - `docs/conventions/encryption-pii.md`
  - `docs/conventions/websocket.md`
  - `docs/conventions/layout.md`
  - `docs/diagrams/sequence-diagrams.md`
  - `docs/diagrams/state-machines.md`
  - `docs/domain/glossary.md`
  - `docs/matrices/authorization.md`

## [DONE] 投稿詳細・目撃詳細にニックネーム表示
- 開始: 2026-05-09 19:00
- 終了: 2026-05-09 19:15
- 状態: DONE
- 編集ファイル:
  - `apps/api/src/sightings/sighting.service.ts`
  - `apps/api/src/sightings/sighting.service.spec.ts`
  - `apps/web/src/components/SightingList.tsx`
  - `apps/web/src/components/PostDetailSheet.tsx`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 更新テスト: findByPost: ニックネーム付き返却テスト更新 1件

## [DONE] issue#240 isRestoring 中の白画面解消
- 開始: 2026-05-09 17:30
- 終了: 2026-05-09 17:40
- 状態: DONE
- 編集ファイル:
  - `apps/web/src/App.tsx`
  - `apps/web/src/App.test.tsx`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 追加テスト: 1件（App: isRestoring 中スピナー表示）

## [DONE] CI E2E タイムアウト修正（globalSetup でAPI起動待ち）
- 開始: 2026-05-09 17:00
- 終了: 2026-05-09 17:10
- 状態: DONE
- 編集ファイル:
  - `apps/web/tests/global-setup.ts`（新規）
  - `apps/web/playwright.config.ts`

## [DONE] issue#237 axios に withCredentials: true を設定
- 開始: 2026-05-09 15:00
- 終了: 2026-05-09 15:20
- 状態: DONE
- コミット: `a7aac295`
- PR: #241
- 編集ファイル:
  - `packages/api-client/src/client.ts`
  - `apps/web/src/api/client.test.ts`（新規）
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 追加テスト: 2件（createClient: withCredentials設定2件）

## [DONE] issue#238 AuthProvider と createClient の refresh 競合解消
- 開始: 2026-05-09 15:40
- 終了: 2026-05-09 16:00
- 状態: DONE
- コミット: `02d7f46f`, `9ae4a1cd`
- PR: #245
- 編集ファイル:
  - `apps/web/src/auth/AuthProvider.tsx`
  - `packages/api-client/src/client.ts`
  - `apps/web/src/api/orvalClient.ts`
  - `apps/web/src/auth/AuthProvider.test.tsx`
  - `apps/web/src/api/client.test.ts`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
- 追加テスト: 6件（AuthProvider: refresh 2件 + createClient: refreshToken 注入 2件 + 既存2件 beforeEach 共通化）

## [TODO] issue#240 isRestoring 中の白画面解消
- issue: https://github.com/Citrus171/nextjsproA/issues/240
- 編集予定ファイル:
  - `apps/web/src/auth/AuthProvider.tsx`
  - `apps/web/src/components/PrivateRoute.tsx`（または同等ファイル）

### #240 isRestoring 中の白画面解消
- issue: https://github.com/Citrus171/nextjsproA/issues/240
- 編集予定ファイル:
  - `apps/web/src/auth/AuthProvider.tsx`
  - `apps/web/src/components/PrivateRoute.tsx`（または同等ファイル）

### #238 AuthProvider と createClient の refresh 競合解消
- issue: https://github.com/Citrus171/nextjsproA/issues/238
- 設計方針: AuthProvider が `getToken`/`refreshToken` 関数を `createClient` に注入する（案B）
- 編集予定ファイル:
  - `apps/web/src/auth/AuthProvider.tsx`
  - `packages/api-client/src/client.ts`

### #240 isRestoring 中の白画面解消
- issue: https://github.com/Citrus171/nextjsproA/issues/240
- 編集予定ファイル:
  - `apps/web/src/auth/AuthProvider.tsx`
  - `apps/web/src/components/PrivateRoute.tsx`（または同等ファイル）

---

## [DONE] CI E2Eテスト修正（error-codes PR対応）
- 開始: 2026-05-09 11:30
- 終了: 2026-05-09 11:40
- 状態: DONE
- 編集ファイル:
  - `apps/api/test/app.e2e.ts`
  - `apps/api/test/health.e2e.ts`

## [DONE] 地図ピンチ操作でコンテキストメニューが誤発火するバグ修正
- 開始: 2026-05-08 16:10
- 終了: 2026-05-08 16:15
- 状態: DONE
- コミット: `be5e5fbe`
- PR: #229
- 編集ファイル:
  - `apps/web/src/pages/Map.tsx`

## [DONE] issue#220 Posts ページ空状態メッセージ改善
- 開始: 2026-05-08 12:40
- 終了: 2026-05-08 12:47
- 状態: DONE
- コミット: `860a1ba3`
- PR: #225
- 編集ファイル:
  - `apps/web/src/pages/Posts.tsx`
  - `apps/web/src/pages/Posts.test.tsx`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## [DONE] issue#218 Posts ページ改善（mine=true・編集ガード・ステータスバッジ・ニックネーム）
- 開始: 2026-05-08 11:45
- 編集予定ファイル:
  - `apps/web/src/pages/Posts.tsx`
  - `apps/web/src/pages/Posts.test.tsx`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
---

## [DONE] issue#214+215+217 ログイン後リダイレクト・PrivateRoute・Mapナビ改善
- 開始: 2026-05-08 10:30
- 終了: 2026-05-08
- 状態: DONE
- コミット: `9caa82db`
- PR: #221
- 編集ファイル:
  - `apps/web/src/pages/LoginWithAuth.tsx`
  - `apps/web/src/pages/LoginWithAuth.test.tsx`
  - `apps/web/src/App.tsx`
  - `apps/web/src/App.test.tsx`
  - `apps/web/src/pages/Map.tsx`
  - `apps/web/src/pages/Map.test.tsx`
  - `apps/web/src/components/Layout.tsx`（削除）
  - `apps/web/src/components/Layout.test.tsx`（削除）
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## 並列タスク競合回避ルール

- **タスク開始時**: `docs/tasks/agent-kilocode.md` を読み込み、`## [IN_PROGRESS]` セクションの `編集予定ファイル` が自身の計画ファイルと重複していないか確認する。重複があればタスクを開始しない。
- **タスク中断時**: このファイルに `## [BLOCKED] タスク名` を追記し、`衝突ファイル` を明示する。
- **タスク終了時**: `[IN_PROGRESS]` → `[DONE]` または `[FAILED]` に更新し、実際の編集ファイルを記録する。

---

## [DONE] issue#204 地図・会話一覧画面にニックネームを表示する
- 開始: 2026-05-07
- 終了: 2026-05-07
- 状態: DONE
- コミット: `fd69f49e`
- PR: #207
- 編集ファイル:
  - `apps/web/src/pages/Map.tsx`
  - `apps/web/src/pages/Map.test.tsx`
  - `apps/web/src/pages/Conversations.tsx`
  - `apps/web/src/pages/Conversations.test.tsx`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## [DONE] issue#203 自分の投稿マーカーをパルスアニメーションで区別する
- 開始: 2026-05-07 15:05
- 終了: 2026-05-07 16:05
- 状態: DONE
- コミット: `5fbc6a19`
- PR: #206
- 編集ファイル:
  - `apps/web/src/pages/Map.tsx`
  - `apps/web/src/pages/Map.test.tsx`
  - `apps/web/src/styles/map.css`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## [DONE] issue#202 JWT payload に nickname を追加 + AuthProvider で公開
- 開始: 2026-05-07 15:00
- 終了: 2026-05-07 15:55
- 状態: DONE
- コミット: `633aa36f`
- PR: #205
- 編集ファイル:
  - `apps/api/src/auth/interfaces/jwt-payload.interface.ts`
  - `apps/api/src/identity/identity.service.ts`
  - `apps/api/src/identity/identity.service.spec.ts`
  - `apps/web/src/auth/AuthProvider.tsx`
  - `apps/web/src/auth/AuthProvider.test.tsx`（新規）
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## [DONE] 会話画面UI改善
- 開始: 2026-05-07 13:00
- 終了: 2026-05-07 14:20
- 状態: DONE
- コミット: `dd7b9aa6`
- PR: #201
- 編集ファイル:
  - `apps/api/src/conversations/conversation.controller.ts`
  - `apps/web/src/pages/ConversationChat.tsx`
- 変更内容:
  - 画像+テキスト同時送信時にbodyが消えるバグ修正（`dto = { ...dto, imageUrl }`）
  - 画像アイコンボタンの視認性改善（text-foreground）
  - メッセージ送信後の自動スクロール追加
  - 長文メッセージの折り返し対応（break-words）
  - 入力欄をtextareaに変更（PC: Enter送信/Shift+Enter改行、スマホ: 改行のみ）
  - 改行を含むメッセージの表示対応（whitespace-pre-wrap）
  - 送信中ローディングスピナー表示（isPending + Loader2）
  - 送信失敗時のエラートースト表示（sonner）
  - 日付区切り表示（xx月xx日）
  - 画像モーダルに閉じる✕ボタンを追加

---

## [DONE] issue#192 MAX_FAVORITES_LIMIT を common/constants.ts に抽出 + issue#195 Prismaインデックス追加
- 開始: 2026-05-07 12:00
- 終了: 2026-05-07 12:10
- 状態: DONE
- 編集ファイル:
  - `apps/api/src/common/constants.ts`（新規）
  - `apps/api/src/posts/post.service.ts`
  - `apps/api/src/sightings/sighting.service.ts`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260507025411_add_performance_indexes/migration.sql`（新規）

---

## [DONE] リファクタリング: 型安全性改善
- 開始: 2026-05-07 11:10 JST
- 終了: 2026-05-07 11:23 JST
- 状態: DONE
- 編集予定ファイル:
  - `apps/api/src/shared/prisma-error.ts`（新規）
  - `apps/api/src/identity/identity.service.ts`
  - `apps/api/src/users/user.controller.ts`
  - `apps/api/src/posts/post.service.spec.ts`
  - `apps/api/src/sightings/sighting.service.spec.ts`
  - `apps/api/src/conversations/conversation.service.spec.ts`
  - `apps/api/src/map/map.service.spec.ts`
  - `apps/api/src/identity/identity.service.spec.ts`
  - `apps/api/src/users/user.controller.spec.ts`

## [DONE] リファクタリング: SharedModule + FileStorageBase + エラー統一
- 開始: 2026-05-07 10:50 JST
- 終了: 2026-05-07 11:08 JST
- 状態: DONE
- 編集ファイル:
  - `apps/api/src/shared/image-processing.service.ts`（新規）
  - `apps/api/src/shared/image-processing.service.spec.ts`（新規）
  - `apps/api/src/shared/file-storage.base.ts`（新規）
  - `apps/api/src/shared/shared.module.ts`（新規）
  - `apps/api/src/posts/image-processing.service.ts`（削除）
  - `apps/api/src/posts/image-processing.service.spec.ts`（削除）
  - `apps/api/src/posts/file-storage.service.ts`
  - `apps/api/src/posts/file-storage.service.spec.ts`
  - `apps/api/src/posts/post.module.ts`
  - `apps/api/src/posts/post.service.ts`
  - `apps/api/src/conversations/image-processing.service.ts`（削除）
  - `apps/api/src/conversations/conversation-file-storage.service.ts`
  - `apps/api/src/conversations/conversation-file-storage.service.spec.ts`
  - `apps/api/src/conversations/conversation.module.ts`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

## [DONE] issue#182 チャットUIに画像送信・インライン表示機能を追加
- 開始: 2026-05-06 12:00
- 終了: 2026-05-06 12:30
- 状態: DONE
- 編集ファイル:
  - `packages/api-client/src/index.ts`
  - `apps/web/src/pages/ConversationChat.tsx`
  - `apps/web/src/pages/ConversationChat.test.tsx`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## [DONE] issue#181 チャットメッセージ画像アップロードAPI
- 開始: 2026-05-06 11:00
- 終了: 2026-05-06 11:30
- 状態: DONE
- 編集ファイル:
  - `apps/api/src/conversations/image-processing.service.ts`（新規）
  - `apps/api/src/conversations/conversation-file-storage.service.ts`（新規）
  - `apps/api/src/conversations/conversation-file-storage.service.spec.ts`（新規）
  - `apps/api/src/conversations/conversation.controller.ts`
  - `apps/api/src/conversations/conversation.controller.spec.ts`
  - `apps/api/src/conversations/conversations.gateway.ts`
  - `apps/api/src/conversations/conversations.gateway.spec.ts`
  - `apps/api/src/conversations/conversation.module.ts`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

---

## [DONE] issue#180 Messageモデルにimageurl追加 + DTO基盤
- 開始: 2026-05-06 09:00
- 終了: 2026-05-06 10:00
- 状態: DONE
- 編集ファイル:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260506121446_add_message_image_url/migration.sql`
  - `apps/api/src/conversations/dto/create-message.dto.ts`
  - `apps/api/src/conversations/dto/create-message.dto.spec.ts`（新規）
  - `apps/api/src/conversations/dto/message-response.dto.ts`
  - `apps/api/src/conversations/conversation.service.ts`
  - `apps/api/src/conversations/conversation.service.spec.ts`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`


## [DONE] issue#142 close + issue#148 暗号鍵バージョニング + issue#149 UptimeRobot/自動ロールバック
- 開始: 2026-05-05 09:00
- 終了: 2026-05-05 09:50
- 状態: DONE
- PR: #163
- 編集ファイル:
  - `apps/api/src/identity/crypto.service.ts`
  - `apps/api/src/identity/crypto.service.spec.ts`
  - `apps/api/src/identity/key-versioning-migration.ts`（新規）
  - `apps/api/src/identity/key-versioning-migration.spec.ts`（新規）
  - `apps/api/scripts/migrate-key-versioning.ts`（新規）
  - `apps/api/.env.example`
  - `scripts/vps-deploy.sh`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`

## [DONE] issue#143 ヘルスチェック /api/health（@nestjs/terminus）
- 開始: 2026-05-04 20:51
- 終了: 2026-05-04 21:32
- 状態: DONE
- 編集ファイル:
  - `apps/api/src/health/health.controller.ts`
  - `apps/api/src/health/health.controller.spec.ts`
  - `apps/api/src/health/health.module.ts`
  - `apps/api/src/health/indicators/prisma-health.indicator.ts`
  - `apps/api/src/health/indicators/uploads-health.indicator.ts`
  - `apps/api/src/app.module.ts`
  - `test/health.e2e.ts`
  - `tests/TESTS.md`
  - `tests/TESTS_TREE.md`
