# テスト一覧

## apps/api

### PostsService (`src/posts/post.service.spec.ts`)

#### findAll

- [x] ページ1・perPage5 で skip=0 / take=5 を渡す
- [x] ページ3・perPage5 で skip=10 を渡す
- [x] items と total を返す

#### findById

- [x] petDetail と location と images を include して取得する

#### create

- [x] ファイルなしで投稿を作成する
- [x] ファイルありで投稿を作成する時、writeFileSyncが呼ばれること
- [x] アップロードディレクトリが存在しない時、mkdirSyncを呼ぶこと
- [x] 画像が sharp でリサイズ・JPEG変換されること
- [x] 画像処理でSharpエラーが発生した場合 BadRequestException をスローする
- [x] lostDate なしは BadRequestException をスローする
- [x] 画像が5枚超の場合 BadRequestException をスローする
- [x] petDetail と location を含む時、トランザクションで一括作成する
- [x] lostDate を指定して作成できる
- [x] トランザクション失敗時に保存済みファイルを削除する

#### addImages

- [x] 画像を追加できる
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は NotFoundException
- [x] 5枚超になる場合は BadRequestException

#### removeImage

- [x] オーナーが画像を削除できる
- [x] ファイルが存在しない場合 unlinkSync を呼ばない
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は NotFoundException
- [x] 別の投稿に属する画像は NotFoundException

#### update

- [x] オーナーが更新できき、petDetail/location/images を含むレスポンスを返す
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)
- [x] lostDate を更新できる
- [x] status を更新できる
- [x] status を lost に戻すと resolvedAt が null になる
- [x] petDetail を upsert できる
- [x] petDetail 未存在かつ必須フィールドなしは BadRequestException
- [x] location を upsert できる
- [x] location 未存在かつ必須フィールドなしは BadRequestException

#### remove

- [x] オーナーが削除できる
- [x] 画像ファイルも削除する
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)
- [x] 管理者は他人の投稿を削除できる

---

### PostsController (`src/posts/post.controller.spec.ts`)

#### list

- [x] デフォルト（page=1, perPage=10）で findAll を呼ぶ
- [x] 文字列クエリを数値に変換して渡す
- [x] 不正な文字列は 1 / 10 にフォールバックする
- [x] items と total を返す

#### get

- [x] 指定 ID の投稿を返す

#### create

- [x] dto と files をサービスに渡す
- [x] ファイル付きで作成できる
- [x] files が undefined の時は空配列を渡す
- [x] petDetail と location を含む dto をサービスに渡す

#### update

- [x] オーナーが更新できる
- [x] オーナー以外は ForbiddenException を伝播する
- [x] 存在しない投稿は HttpException を伝播する
- [x] petDetail と location を含む dto をサービスに渡す

#### addImages

- [x] 画像を追加できる
- [x] files が undefined の時は空配列を渡す
- [x] オーナー以外は ForbiddenException を伝播する
- [x] 枚数超過は BadRequestException を伝播する

#### removeImage

- [x] オーナーが画像を削除できる
- [x] オーナー以外は ForbiddenException を伝播する
- [x] 存在しない画像は NotFoundException を伝播する

#### imageFileFilter

- [x] fileがnullの時、cb(null, false)を呼ぶこと
- [x] originalnameがない時、cb(null, false)を呼ぶこと
- [x] 許可されたMIMEタイプの時、cb(null, true)を呼ぶこと
- [x] 許可されていないMIMEタイプの時、BadRequestExceptionを渡すこと

#### remove

- [x] オーナーが削除できる
- [x] オーナー以外は ForbiddenException を伝播する
- [x] 存在しない投稿は HttpException を伝播する

---

#### toggleFavorite

- [x] お気に入りしていない状態でtoggleFavoriteを呼ぶと { favorited: true } を返す
- [x] 既にお気に入り済みの状態でtoggleFavoriteを呼ぶと { favorited: false } を返す
- [x] 自分の投稿をお気に入りしようとすると ForbiddenException
- [x] お気に入りが20件の状態でtoggleFavoriteを呼ぶと BadRequestException
- [x] 存在しない投稿をお気に入りしようとすると NotFoundException

---

### PostsController (`src/posts/post.controller.spec.ts`) - toggleFavorite

#### toggleFavorite

- [x] { favorited: true } を返す
- [x] ForbiddenException を伝播する
- [x] BadRequestException を伝播する

---

### SightingsService (`src/sightings/sighting.service.spec.ts`)

#### create

- [x] 有効なデータでSightingを作成できること
- [x] 投稿者本人が自分のPostにSightingを作成しようとすると ForbiddenException
- [x] 存在しないPostにSightingを作成しようとすると NotFoundException

#### findByPost

- [x] postIdに紐づくSighting一覧をcreatedAt降順で返すこと

#### remove

- [x] 本人がSightingを削除できること
- [x] 他者が削除しようとすると ForbiddenException
- [x] 存在しないSightingを削除しようとすると NotFoundException
- [x] 管理者は他者のSightingを削除できること

#### toggleFavorite

- [x] お気に入りしていない状態でtoggleFavoriteを呼ぶと { favorited: true } を返す
- [x] 既にお気に入り済みの状態でtoggleFavoriteを呼ぶと { favorited: false } を返す
- [x] 自分の目撃情報をお気に入りしようとすると ForbiddenException
- [x] お気に入りが20件の状態でtoggleFavoriteを呼ぶと BadRequestException
- [x] 存在しないSightingをお気に入りしようとすると NotFoundException

---

### SightingsController (`src/sightings/sighting.controller.spec.ts`)

#### create

- [x] 目撃情報を作成してサービスの結果を返すこと

#### findByPost

- [x] postIdに紐づく目撃情報一覧を返すこと

#### remove

- [x] 目撃情報を削除してサービスの結果を返すこと
- [x] ForbiddenException を伝播する

#### toggleFavorite

- [x] { favorited: true } を返す
- [x] { favorited: false } を返す（解除）
- [x] BadRequestException を伝播する
- [x] NotFoundException を伝播する

---

### ConversationsService (`src/conversations/conversation.service.spec.ts`)

#### create

- [x] 有効なデータで会話を作成できること
- [x] 同一postId+sightingIdの会話はConflictException
- [x] 存在しないpostIdはNotFoundException
- [x] 存在しないsightingIdはNotFoundException
- [x] 会話参加者以外（無関係なユーザー）はForbiddenException

#### findAllForUser

- [x] 自分がownerまたはsighterとして参加する会話一覧を返すこと

#### createMessage

- [x] 会話参加者がメッセージを送信できること
- [x] bodyが1000文字超過はBadRequestException
- [x] 会話参加者以外のメッセージ送信はForbiddenException
- [x] 存在しない会話へのメッセージはNotFoundException

#### findMessages

- [x] 会話参加者がメッセージ一覧を取得できること
- [x] 会話参加者以外のメッセージ一覧取得はForbiddenException
- [x] 存在しない会話のメッセージ一覧はNotFoundException

#### markAsRead

- [x] 相手が送ったunreadメッセージをすべて既読にすること
- [x] 会話参加者以外はForbiddenException
- [x] 存在しない会話はNotFoundException

---

### ConversationsGateway (`src/conversations/conversations.gateway.spec.ts`)

#### handleConnection

- [x] トークンなしで接続した場合は切断される
- [x] 無効なトークンで接続した場合は切断される
- [x] 有効なトークンで接続した場合はsocket.data.userIdが設定される
- [x] Authorizationヘッダー（Bearer形式）でも認証できる

#### broadcastMessage

- [x] 最小化されたペイロードのみemitする（readAtを含まない）

---

### ConversationsController (`src/conversations/conversation.controller.spec.ts`)

#### createMessage

- [x] メッセージ作成後にbroadcastMessageを呼び出すこと
- [x] サービスが例外を投げた場合はbroadcastMessageを呼ばないこと

#### markAsRead

- [x] 既読更新結果を返すこと

---

### MapService (`src/map/map.service.spec.ts`)

#### getMarkers

- [x] bbox内のPostマーカーが type='post' で返ること
- [x] bbox内のSightingマーカーが type='sighting' で返ること
- [x] statusフィルタ指定時にPostクエリのwhereにstatusが含まれること
- [x] statusフィルタ指定時にSightingクエリのwhereにpost.statusが含まれること
- [x] bboxクエリ条件がPostのlocation.lat/lngフィルタとして渡ること
- [x] bboxクエリ条件がSightingのlat/lngフィルタとして渡ること
- [x] bboxクエリが文字列でも数値フィルタとして渡ること
- [x] 空白文字列と非有限数はbboxフィルタに含めないこと
- [x] フィルタなしで全マーカー（Post+Sighting）が返ること

---

### RolesGuard (`src/auth/roles.guard.spec.ts`)

- [x] @Roles デコレータがない場合は通す
- [x] ロールが一致する場合は通す
- [x] ロールが一致しない場合は ForbiddenException をスローする
- [x] ユーザーが未設定の場合は ForbiddenException をスローする

---

### AuthService (`src/auth/auth.service.spec.ts`)

#### validateUser

- [x] 正しいパスワードで id と email と role を返す

（その他既存テスト省略）

### UserService (`src/users/user.service.spec.ts`)

#### createUser

- [x] nickname の重複時に ConflictException をスローする

#### deleteUser

- [x] 指定IDのユーザーを削除する
- [x] 存在しないIDは Prisma エラーを再スローする

（その他既存テスト省略）

---

---

## E2E (`test/app.e2e.ts`)

### POST /api/users/register

- [x] オーナーユーザーを登録できる (201)
- [x] 非オーナーユーザーを登録できる (201)
- [x] name が未指定のとき 400 を返す
- [x] name が空文字のとき 400 を返す
- [x] 重複メールは 400 を返す
- [x] 重複 nickname で 409 を返す
- [x] 短すぎるパスワードは 400 を返す

### POST /api/auth/login

- [x] オーナー: accessToken を返す (200)
- [x] 非オーナー: accessToken を返す (200)
- [x] 誤パスワードは 400 を返す

### POST /api/posts

- [x] 認証済みで投稿を作成できる (201)
- [x] 未認証は 401 を返す

### GET /api/posts

- [x] ゲストでも一覧を取得できる (200)
- [x] page / perPage クエリが機能する

### GET /api/posts/:id

- [x] ゲストでも詳細を取得できる (200)

### PATCH /api/posts/:id

- [x] 未認証は 401 を返す
- [x] 非オーナーは 403 を返す
- [x] オーナーは更新できる (200)

### POST /api/posts/:id/images

- [x] 未認証は 401 を返す
- [x] 非オーナーは 403 を返す
- [x] オーナーは画像をアップロードできる (201)

### DELETE /api/posts/:id/images/:imageId

- [x] 未認証は 401 を返す
- [x] 非オーナーは 403 を返す
- [x] オーナーは画像を削除できる (200)

### DELETE /api/posts/:id

- [x] 未認証は 401 を返す
- [x] 非オーナーは 403 を返す
- [x] オーナーは削除できる (200)
- [x] 存在しない投稿は 404 を返す

### POST /api/auth/refresh

- [x] 有効な refreshToken で新しい accessToken を返す (200)
- [x] Cookie なしは 401 を返す

### POST /api/auth/logout

- [x] ログアウトで Cookie が削除される (200)

---

## Web E2E (`apps/web/tests/playwright/e2e.spec.ts`)

- [x] 新規登録 → ログイン → 投稿作成 → 投稿一覧表示 → ログアウト
