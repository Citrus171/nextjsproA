# テスト一覧

## apps/api

### openapi-examples (`src/common/openapi-examples.spec.ts`)

- [x] 用途別の OpenAPI 例示 ID が重複しないこと
- [x] 汎用 ID 例示は投稿 ID 例示と一致すること

### PostsService (`src/posts/post.service.spec.ts`)

#### findAll

- [x] ページ1・perPage5 で skip=0 / take=5 を渡す
- [x] ページ3・perPage5 で skip=10 を渡す
- [x] items と total を返し、投稿者名を authorNickname に詰める

#### findById

- [x] petDetail/location/images と user.nickname を取得し authorNickname を返す

#### create

- [x] ファイルなしで投稿を作成する
- [x] postType 未指定の時、cat で保存して返す
- [x] ファイルありで投稿を作成する時、fileStorageService.saveFileが呼ばれること
- [x] 元のファイルの拡張子に関わらず保存拡張子が .jpg になること
- [x] 無料プランの画像が3枚を超えると ForbiddenException をスローする
- [x] premium ユーザーは画像を10枚まで添付できる
- [x] 画像処理でSharpエラーが発生した場合 BadRequestException をスローする
- [x] lostDate なしは BadRequestException をスローする
- [x] 無料プランの画像が4枚を超えると ForbiddenException をスローする
- [x] petDetail と location を含む時、トランザクションで一括作成する
- [x] lostDate を指定して作成できる
- [x] トランザクション失敗時に保存済みファイルを削除する
- [x] 無料プランの月間投稿数が3件に達している時は ForbiddenException をスローする
- [x] 翌月になると無料プランの投稿数はリセットされる
- [x] premium ユーザーは月間投稿数の制限を受けない

#### addImages

- [x] 画像を追加できる
- [x] 無料プランで追加後の合計が3枚を超えると ForbiddenException
- [x] premium ユーザーは10枚まで追加できる
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は NotFoundException
- [x] DB作成失敗時に保存済みファイルを削除する

#### removeImage

- [x] オーナーが画像を削除できる
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は NotFoundException
- [x] 別の投稿に属する画像は NotFoundException

### ImageProcessingService (`src/posts/image-processing.service.spec.ts`)

- [x] processが処理済みBufferを返すこと
- [x] width=1200・withoutEnlargement=true でリサイズすること
- [x] quality=80 でJPEG変換すること
- [x] sharpがエラーをスローした時、BadRequestExceptionになること

### FileStorageService (`src/posts/file-storage.service.spec.ts`)

#### saveFile

- [x] saveFileが uploads/{postId}/{uuid}.jpg 形式のURLを返すこと
- [x] saveFileがwriteFileSyncを呼ぶこと
- [x] ディレクトリが存在しない時、mkdirSyncを呼ぶこと
- [x] ディレクトリが存在する時、mkdirSyncを呼ばないこと
- [x] imageProcessing.processに入力Bufferを渡すこと
- [x] 保存ファイル名がUUID v4 + .jpg 形式になること
- [x] 元のファイル名（originalname）が保存パスに含まれないこと
- [x] imageProcessingがエラーをスローした時、BadRequestExceptionが伝播すること

#### deleteFile

- [x] ファイルが存在する時、unlinkSyncを呼ぶこと
- [x] ファイルが存在しない場合、unlinkSyncを呼ばないこと

#### update

- [x] オーナーが更新できき、petDetail/location/images を含むレスポンスを返す
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)
- [x] lostDate を更新できる
- [x] status を更新できる
- [x] postType を更新できる
- [x] status を lost に戻すと resolvedAt が null になる
- [x] petDetail を upsert できる
- [x] petDetail 未存在かつ必須フィールドなしは BadRequestException
- [x] location を upsert できる
- [x] location 未存在かつ必須フィールドなしは BadRequestException

#### dto

- [x] postType が未指定のときはバリデーションは通ること
- [x] postType が null のときはバリデーションエラーになること

#### remove

- [x] オーナーが削除できる
- [x] 画像ファイルも削除する
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)
- [x] 管理者は他人の投稿を削除できる

- [x] 月間投稿数の集計は UTC 境界で判定する
- [x] トランザクション競合時は再試行して投稿を作成する

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

#### findOne

- [x] 指定IDの目撃情報を報告者のニックネーム付きで返すこと
- [x] 存在しないIDを指定するとNotFoundExceptionを送出すること

---

### SightingsController (`src/sightings/sighting.controller.spec.ts`)

#### create

- [x] 目撃情報を作成してサービスの結果を返すこと

#### findOne

- [x] 指定IDの目撃詳細を返すこと
- [x] NotFoundException を伝播する

### CreateSightingDto (`src/sightings/dto/create-sighting.dto.spec.ts`)

- [x] postId がなくてもバリデーションエラーにならないこと
- [x] postId が空文字のときはバリデーションエラーになること

### SightingsService (`src/sightings/sighting.service.spec.ts`)

#### create

- [x] postId が空文字の時は Post チェックを行って NotFoundException になること

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
- [x] 同一postId+sightingIdの会話は既存の会話を返すこと
- [x] 存在しないpostIdはNotFoundException
- [x] 存在しないsightingIdはNotFoundException
- [x] 会話参加者以外（無関係なユーザー）はForbiddenException
- [x] standalone Sighting は NotFoundException で会話を作成できないこと

#### findAllForUser

- [x] 自分がownerまたはsighterとして参加する会話一覧をinclude付きで取得すること
- [x] ownerの場合は相手（sighter）のニックネームをpartnerNicknameとして返すこと
- [x] sighterの場合は相手（owner）のニックネームをpartnerNicknameとして返すこと

#### createMessage

- [x] 会話参加者がメッセージを送信できること
- [x] bodyが1000文字超過はBadRequestException
- [x] 会話参加者以外のメッセージ送信はForbiddenException
- [x] 存在しない会話へのメッセージはNotFoundException

#### findMessages

- [x] 会話参加者がメッセージ一覧を取得できること
- [x] 会話参加者以外のメッセージ一覧取得はForbiddenException
- [x] 存在しない会話のメッセージ一覧はNotFoundException

#### findOneForUser

- [x] 投稿者が会話を取得すると相手は目撃者のニックネームであること
- [x] 目撃者が会話を取得すると相手は投稿者のニックネームであること
- [x] 参加者以外が会話を取得するとNotFoundException

#### markAsRead

- [x] 相手が送ったunreadメッセージをすべて既読にすること
- [x] 会話参加者以外はForbiddenException
- [x] 存在しない会話はNotFoundException

#### getUnreadCount

- [x] ユーザーの全未読メッセージ数を返すこと
- [x] 未読メッセージがない場合は 0 を返すこと

---

### ConversationsGateway (`src/conversations/conversations.gateway.spec.ts`)

#### handleConnection

- [x] トークンなしで接続した場合は切断される
- [x] 無効なトークンで接続した場合は切断される
- [x] 有効なトークンで接続した場合はsocket.data.userIdが設定される
- [x] Authorizationヘッダー（Bearer形式）でも認証できる

#### JWT 再検証

- [x] joinConversation 時にトークンが期限切れの場合は切断されること
- [x] leaveConversation 時にトークンが期限切れの場合は切断されること

#### handleJoin

- [x] userIdがない場合は切断されjoinしない
- [x] 会話参加権限がない場合は切断されjoinしない
- [x] 会話が存在しない場合は切断されjoinしない
- [x] 会話参加権限がある場合は指定した会話ルームにjoinすること

#### handleLeave

- [x] userIdがない場合は切断されleaveしない
- [x] userIdがある場合は指定した会話ルームからleaveすること

#### handleDisconnect

- [x] 切断時に userSocketMap から該当エントリが削除されること
- [x] 別のソケットで上書きされている場合は削除しないこと

#### broadcastMessage

- [x] 最小化されたペイロードのみemitする（readAtを含まない）

---

### ConversationsController (`src/conversations/conversation.controller.spec.ts`)

#### createMessage

- [x] メッセージ作成後にbroadcastMessageを呼び出すこと
- [x] サービスが例外を投げた場合はbroadcastMessageを呼ばないこと

#### markAsRead

- [x] 既読更新結果を返すこと

#### getUnreadCount

- [x] ユーザーの未読メッセージ数を返すこと

---

### MapService (`src/map/map.service.spec.ts`)

#### getMarkers

- [x] bbox内のPostマーカーが type='post' で返ること
- [x] bbox内のSightingマーカーが type='sighting' で返ること
- [x] standalone Sighting は statusなしで lost として返ること
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

### AppThrottlerGuard (`src/auth/throttler.guard.spec.ts`)

- [x] 制限超過時に日本語メッセージ付き ThrottlerException をスローすること

---

### IdentityService (`src/identity/identity.service.spec.ts`)

#### login

- [x] 正しいメールとパスワードでAuthResultを返すこと
- [x] DBにはtokenHashが保存され、平文トークンは保存されないこと
- [x] パスワード不一致でUnauthorizedExceptionを投げること
- [x] 存在しないメールアドレスでUnauthorizedExceptionを投げること
- [x] HMACのみで検索し、SHA256フォールバックを行わないこと
- [x] production環境ではCookieのsecureとsameSiteが適切に設定されること

#### refresh

- [x] 有効なトークンで新しいAuthResultを返すこと
- [x] トークンが存在しない場合はUnauthorizedExceptionを投げること
- [x] 期限切れトークンはUnauthorizedExceptionを投げること

#### logout

- [x] リフレッシュトークンを削除すること
- [x] 存在しないトークンでもエラーを投げないこと

#### register

- [x] 正常にユーザーを登録しUserDtoを返すこと
- [x] メールアドレス重複でConflictExceptionを投げること
- [x] ニックネーム重複でConflictExceptionを投げること

#### findAll

- [x] 全ユーザーをパスワードなしで返すこと

#### deleteUser

- [x] ユーザーを削除しUserDtoを返すこと

### emailHashマイグレーション (`src/identity/email-hash-migration.spec.ts`)

#### 基本動作

- [x] ユーザーが0件の時、全カウントが0の結果を返すこと

#### HMACへの更新

- [x] SHA256ハッシュのユーザーがHMACに更新されること
- [x] 既にHMACのユーザーはスキップされること（冪等）

#### dry-runモード

- [x] dry-runの時、DBを更新せず結果のみ返すこと

#### スキップケース

- [x] emailEncryptedがnullのユーザーはスキップされること
- [x] 復号に失敗したユーザーはエラーカウントされること

#### 複数ユーザー混在

- [x] SHA256・HMAC済み・null混在の時、それぞれ正しくカウントされること

---

### CryptoService (`src/identity/crypto.service.spec.ts`)

#### normalizeEmail

- [x] 大文字を小文字にし、前後空白を除去すること
- [x] 既に正規化済みのメールアドレスはそのまま返すこと

#### encryptEmail / decryptEmail

- [x] 暗号化して復号すると元のメールアドレスに戻ること
- [x] 異なる平文は異なる暗号文を生成すること
- [x] 復号: 壊れたデータは null を返すこと

#### hmacEmail

- [x] 同じ入力に対して同じHMACを生成すること（決定性）
- [x] 異なる入力に対して異なるHMACを生成すること
- [x] 正規化されたメールアドレスに対してのみ使われること

#### sha256Hex

- [x] 同じ入力に対して同じハッシュを生成すること
- [x] 異なる入力に対して異なるハッシュを生成すること
- [x] SHA256ハッシュは64文字の16進数であること

#### generateSecureToken

- [x] 96文字の16進数文字列を生成すること (48 bytes)
- [x] 毎回異なるトークンを生成すること

### UsersController (`src/users/user.controller.spec.ts`)

- [x] nickname と name がないと BadRequestException を返す
- [x] ConflictException はそのまま伝播する
- [x] nickname があれば service に渡す
- [x] nickname がなくても name を後方互換で使う

#### remove

- [x] 管理者がユーザーを削除できる
- [x] 存在しないユーザーIDはP2025エラーを404に変換する
- [x] P2025以外のエラーは再スローされる

### Dredd 契約テスト

- [x] `packages/api-client/openapi.json` に対して `dredd-hooks-jemini.js` を使って API 契約を検証する

### RegisterDto (`src/users/dto/register.dto.spec.ts`)

- [x] name が未指定でもバリデーションは通る
- [x] nickname が未指定でもバリデーションは通る
- [x] name と nickname があればバリデーションは通る

（その他既存テスト省略）

---

---

## SentryFilter (`src/sentry/sentry.filter.spec.ts`)

- [x] 5xx エラーの時、Sentry.captureException が呼ばれること
- [x] 4xx HttpException の時、Sentry.captureException が呼ばれないこと
- [x] HttpException 以外の Error の時、Sentry.captureException が呼ばれること

---

## ヘルスチェック (`src/health/health.controller.spec.ts`)

### check()

- [x] 全チェックが正常なとき、status:okを返すこと
- [x] DBが異常なとき、status:errorを返すこと
- [x] check()はHealthCheckService.check()を呼び出すこと

---

## ヘルスチェック E2E (`test/health.e2e.ts`)

### GET /api/health 正常系

- [x] DBとディスクとuploadsが正常なとき、200とstatus:okを返すこと
- [x] 認証なしでアクセスできること

### GET /api/health 異常系

- [x] DB切断時に503を返すこと

---

## レート制限 E2E (`test/throttler.e2e.ts`)

### POST /api/auth/login のレート制限

- [x] 制限内（2回）は 401 が返ること（認証失敗だがレート制限ではない）
- [x] 制限超過（3回目）は 429 と日本語エラーメッセージが返ること

### POST /api/users/register のレート制限

- [x] 制限内（2回）は登録成功または重複エラーが返ること（429 ではない）
- [x] 制限超過（3回目）は 429 と日本語エラーメッセージが返ること

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

## Web Unit (`apps/web/src/**/*.test.tsx`)

- [x] App で未認証で /posts にアクセスしたとき、Posts ページが表示されること
- [x] App で未認証で /create にアクセスしたとき、/login にリダイレクトされること
- [x] CreatePost で必須項目を入力して送信した時、lostDate を正規化して cat投稿として作成し /posts へ戻る
- [x] CreatePost で投稿APIが失敗した時、エラートーストを表示して遷移しないこと
- [x] CreatePost で埋め込み地図が表示されず、地図ピッカー起動ボタンが表示されること
- [x] CreatePost で地図ピッカー起動ボタンをクリックするとフルスクリーンピッカーが開くこと
- [x] CreatePost でピッカー内で「この場所に決める」を押すとピッカーが閉じて座標が表示されること
- [x] EditPost で投稿データ取得後、petDetail を含むフォームに初期値がセットされること
- [x] EditPost で変更して保存した時、updatePost が petDetail/location を含むデータで呼ばれること
- [x] EditPost で削除ボタンをクリックした時、確認ダイアログが表示されること
- [x] EditPost で削除ダイアログで「削除を確定する」を押した時、deletePost が呼ばれ / にリダイレクトされること
- [x] EditPost で削除ダイアログで「キャンセル」を押した時、deletePost が呼ばれないこと
- [x] EditPost で既存画像がサムネイル表示されること
- [x] EditPost で既存画像の個別削除ボタンをクリックした時、deleteImage が imageId で呼ばれること
- [x] EditPost で画像追加アップロードで addImages が呼ばれること
- [x] EditPost で remainingSlots=0 の時、追加アップロードボタンが非表示になること
- [x] EditPost で remainingSlots を超える枚数を選択した時、エラーメッセージが表示され addImages が呼ばれないこと
- [x] Map で検索バーと種別フィルターを表示する
- [x] Map で迷い猫投稿を押すと /create に遷移する
- [x] Map で迷子マーカーを押すと詳細シートが開き投稿者名を表示する
- [x] Map で目撃マーカーを押すと目撃情報シートが開くこと
- [x] Map で迷子フィルターを押すと迷子マーカーだけが表示される
- [x] Map で現在地ボタンを押すと現在地へ移動する
- [x] Map で未認証でアカウントボタンを押した時、ログアウト確認ダイアログが表示されないこと
- [x] Map で認証済みでアカウントボタンを押した時、ログアウト確認ダイアログが表示されること
- [x] Map のログアウト確認ダイアログでキャンセル押下時、ログアウト処理が実行されないこと
- [x] Map のログアウト確認ダイアログで OK 押下時、ログアウト処理が実行されること
- [x] Map で未認証のまま「目撃を報告する」をクリックした時、/login にリダイレクトされること
- [x] Map で認証済みかつ他者のPostで「目撃を報告する」をクリックした時、SightingModal が開くこと
- [x] Map で未認証で「目撃投稿」ボタンをクリックした時、/login にリダイレクトされること
- [x] Map で認証済みで「目撃投稿」ボタンをクリックした時、SightingModal が開くこと
- [x] PostDetailSheet で isOpen=true の時、ダイアログが表示されること
- [x] PostDetailSheet で isLoading=true の時、ローディングが表示されること
- [x] PostDetailSheet で status=lost の時、迷子バッジが表示されること
- [x] PostDetailSheet で status=resolved の時、解決済みバッジが表示されること
- [x] PostDetailSheet で markerType=post の時、迷い猫投稿タイトルが表示されること
- [x] PostDetailSheet で markerType=sighting の時、目撃情報タイトルが表示されること
- [x] PostDetailSheet で petDetail がある時、詳細情報が表示されること
- [x] PostDetailSheet で petDetail が null の時、特徴セクションが表示されないこと
- [x] PostDetailSheet で location がある時、住所が表示されること
- [x] PostDetailSheet で location が null の時、場所セクションが表示されないこと
- [x] PostDetailSheet で画像がある時、1枚目の画像が表示されること
- [x] PostDetailSheet で画像がない時、プレースホルダーが表示されること
- [x] PostDetailSheet で画像が複数枚ある時、すべての画像がカルーセルとして表示されること
- [x] PostDetailSheet で画像が1枚のみの時、ドットインジケーターが表示されないこと
- [x] PostDetailSheet で画像が複数枚の時、ドットインジケーターが表示されること
- [x] PostDetailSheet で閉じるボタンを押した時、onClose が呼ばれること
- [x] PostDetailSheet でログイン済みかつ自分がSighting投稿者かつPost投稿者でない時、メッセージボタンが表示されること
- [x] PostDetailSheet でcurrentUserIdが未指定（未ログイン）の時、メッセージボタンが非表示であること
- [x] PostDetailSheet で自分がPost投稿者の時、メッセージボタンが非表示であること
- [x] PostDetailSheet で自分がSighting投稿者でない時、メッセージボタンが非表示であること
- [x] PostDetailSheet でmarkerType=postの時、メッセージボタンが非表示であること
- [x] PostDetailSheet でメッセージボタンを押した時、onSendMessageが呼ばれること
- [x] PostDetailSheet で markerType=post かつ他者のPost の時、目撃を報告するボタンが表示されること
- [x] PostDetailSheet で未認証（currentUserId=null）の時、目撃を報告するボタンが表示されること
- [x] PostDetailSheet で自分がPost投稿者の時、目撃を報告するボタンが非表示であること
- [x] PostDetailSheet で markerType=sighting の時、目撃を報告するボタンが非表示であること
- [x] PostDetailSheet でボタンを押した時、onReportSighting が postId で呼ばれること
- [x] SightingList でローディング中は読み込み中テキストが表示されること
- [x] SightingList で Sighting が 0 件の時、空状態メッセージが表示されること
- [x] SightingList で Sighting 一覧に sightedAt・address・comment が表示されること
- [x] SightingList で自分の Sighting にのみ削除ボタンが表示されること
- [x] SightingList で他人の Sighting には削除ボタンが表示されないこと
- [x] SightingList で削除ボタン押下で AlertDialog が表示されること
- [x] SightingList で AlertDialog 確認で deleteSighting が呼ばれること
- [x] SightingList で削除成功後に onSightingDeleted コールバックが呼ばれること
- [x] SightingList で削除処理中は確認ダイアログの削除ボタンが無効化されること
- [x] SightingList で削除 API が失敗した時、エラーメッセージが表示されること
- [x] SightingModal で isOpen=true の時、フォームが表示されること
- [x] SightingModal で postId が渡された時、postId フィールドが非表示であること
- [x] SightingModal で必須項目を入力して送信すると、createSighting が正しく呼ばれること
- [x] SightingModal で必須項目未入力で送信しても、createSighting が呼ばれないこと
- [x] SightingModal で閉じるボタンを押した時、onClose が呼ばれること
- [x] SightingModal で緯度が数値でない時、エラーメッセージが表示されること
- [x] SightingModal で postId なしで送信すると、postId を含まずに createSighting が呼ばれること
- [x] SightingModal で「地図から選択」ボタンが表示されること（postId あり・なし両方）
- [x] SightingModal で「地図から選択」クリックで onSelectFromMap が呼ばれること
- [x] SightingModal で pickedLocation が更新された時、lat/lng/address フィールドに反映されること
- [x] SightingModal で pickedLocation に geocodeError がある時、エラーメッセージが表示されること
- [x] SightingModal で forceMount 時、isOpen=false → true でフォーム値が保持されること
- [x] Map で「目撃投稿」ボタンクリックで SightingModal が開くこと
- [x] Map で「地図から選択」クリック後、「タップして場所を選択」バナーが表示されること
- [x] Map で地図クリックで lat/lng・住所が SightingModal にセットされ再表示されること
- [x] Map で Nominatim 失敗時、lat/lng セット済みでモーダルが再表示されエラーメッセージが表示されること
- [x] reverseGeocode で正常時、Nominatim から住所文字列を返すこと
- [x] reverseGeocode で HTTP エラー時、geocodeError を返すこと
- [x] reverseGeocode でネットワークエラー時、geocodeError を返すこと
- [x] Conversations で会話一覧が表示される時、相手ニックネームと投稿タイトルが表示されること
- [x] Conversations で lastMessageがある時、最新メッセージ本文が表示されること
- [x] Conversations で lastMessageがない時、メッセージなし文言が表示されること
- [x] Conversations でローディング中はスピナー表示されること
- [x] Conversations で会話がない時は空メッセージが表示されること
- [x] Conversations で取得エラーの時、エラーメッセージが表示されること
- [x] Conversations でunreadCountが1以上の時、未読バッジが表示されること
- [x] Conversations でunreadCountが1以上の時、未読バッジが青色の丸スタイルで表示されること
- [x] Conversations でunreadCountが0の時、未読バッジが表示されないこと
- [x] Conversations で← Map ボタンをクリックした時、/ に遷移すること
- [x] Conversations で会話セルをクリックした時、/conversations/:idへ遷移すること
- [x] Conversations で5秒間隔でポーリングするようにuseQueryが呼ばれること
- [x] Conversations でエラー時はポーリングが停止すること
- [x] formatDate で1分未満の時、「今」を返すこと
- [x] formatDate で1分の時、「1分前」を返すこと
- [x] formatDate で59分の時、「59分前」を返すこと
- [x] formatDate で60分（1時間）の時、「1時間前」を返すこと
- [x] formatDate で23時間の時、「23時間前」を返すこと
- [x] formatDate で24時間（1日）の時、「1日前」を返すこと
- [x] formatDate で6日の時、「6日前」を返すこと
- [x] formatDate で7日以上の時、年/月/日形式で返すこと
- [x] formatDate で年またぎの時、年情報が含まれること
- [x] ConversationChat でページ開時、相手ニックネームがヘッダーに表示されること
- [x] ConversationChat で← 会話一覧ボタンをクリックした時、/conversations に遷移すること
- [x] ConversationChat でメッセージリストがスクロール可能な領域であること
- [x] ConversationChat で入力欄が画面下部に固定されていること
- [x] ConversationChat でメッセージ一覧が表示される時、各bodyが表示されること
- [x] ConversationChat で自分のメッセージには自分用クラスが付くこと
- [x] ConversationChat で自分のメッセージが右寄せで青色のバブルスタイルであること
- [x] ConversationChat で相手のメッセージが左寄せでグレーのバブルスタイルであること
- [x] ConversationChat でページ開時に joinConversation イベントが送信されること
- [x] ConversationChat で newMessage イベント受信時、メッセージリストに追加されること
- [x] ConversationChat で disconnect イベント受信時、切断バナーが表示されること
- [x] ConversationChat で切断バナーはインラインstyleではなくTailwindクラスでスタイルされていること
- [x] ConversationChat で connect イベント受信時、切断バナーが非表示になること
- [x] ConversationChat で connect_error イベント受信時、切断バナーが表示されること
- [x] ConversationChat で再接続時に joinConversation が再送されること
- [x] ConversationChat で送信ボタンクリック時、mutate が呼ばれること
- [x] ConversationChat で1000文字超の入力は送信ボタンが無効になること
- [x] ConversationChat でページを開いた時に markAsRead が呼ばれること
- [x] ConversationChat でメッセージローディング中は「読み込み中...」が統一されたスタイルで表示されること
- [x] ConversationChat でローディング表示が統一されたスタイルであること
- [x] ConversationChat でメッセージ取得エラー時は「メッセージの取得に失敗しました」が統一されたスタイルで表示されること
- [x] ConversationChat でエラー表示が統一されたスタイルであること

### Layout (`src/components/Layout.test.tsx`)

- [x] アウトレットの子ルートがレンダリングされること
- [x] ボトムタブが表示されること
- [x] /login パスではタブバーが表示されないこと
- [x] /register パスではタブバーが表示されないこと
- [x] authRequired タブ 未認証時は /login への誘導リンクが表示されること
- [x] authRequired タブ 認証時はタブ本来のリンク先が表示され、現在パスならハイライトされること
- [x] authOnly タブ 未認証時は表示されないこと
- [x] authOnly タブ 認証時は表示されること

### Drawer (`src/components/ui/drawer.test.tsx`)

- [x] open=trueの時、子要素が表示されること
- [x] open=falseの時、子要素が表示されないこと
- [x] snapPointsが反映されること
- [x] Closeコンポーネントがクリックされた時onOpenChangeが呼ばれること

### LoginWithAuth (`src/pages/LoginWithAuth.test.tsx`)

- [x] フォームが正しくレンダリングされること
- [x] パスワード表示トグルで入力欄のtype属性が切り替わること
- [x] 正常ログイン時、投稿一覧（/posts）にリダイレクトすること
- [x] 認証エラー時、フォーム上部にエラーバナーが表示されること

### Register (`src/pages/Register.test.tsx`)

- [x] フォームが正しくレンダリングされること（名前は任意、ログインへのリンクあり）
- [x] メール形式が不正な時、フィールド下にエラーが表示されること
- [x] パスワードが8文字未満の時、フィールド下にエラーが表示されること
- [x] パスワードと確認用が一致しない時、フィールド下にエラーが表示されること
- [x] 正常登録後、ログイン画面（/login）にリダイレクトすること

### Posts (`src/pages/Posts.test.tsx`)

- [x] Posts でデータ取得中はローディングスピナーが表示されること
- [x] Posts で投稿データがカード形式で表示されること
- [x] Posts で画像がない時は「画像がありません」と表示されること
- [x] Posts でペット名がない時は「名前不明」と表示されること
- [x] Posts でセンチネルが交差した時、次のページをフェッチすること
- [x] Posts で追加フェッチ中はローディングスピナーが表示されること
- [x] Posts で全件表示後は「これ以上ありません」と表示されること
- [x] Posts で投稿が0件の時は「投稿がありません」と表示されること
- [x] Posts でDeleteボタンをクリックした時、AlertDialogが表示されること
- [x] Posts でAlertDialogでキャンセルをクリックした時、削除が実行されないこと
- [x] Posts でAlertDialogで削除を確認した時、投稿が削除され削除完了トーストが表示されること
- [x] Posts で削除が失敗した時、エラートーストが表示されること
- [x] Posts で地図アイコンボタンをクリックした時、/?postId=xxx に遷移すること
- [x] Posts で← Map ボタンをクリックした時、/ に遷移すること

---

## Web E2E (`apps/web/tests/playwright/e2e.spec.ts`)

- [x] 新規登録 → ログイン → 投稿作成 → 投稿一覧表示 → ログアウト

## Web E2E (`apps/web/tests/playwright/create-post-map-flow.spec.ts`)

- [x] 画像3枚で迷い猫投稿し、マーカークリックで登録内容が表示されること

---

## LoggerInterceptor (`src/logger/logger.interceptor.spec.ts`)

- [x] 正常レスポンスの時、method・url・statusCode・durationをログ出力すること
- [x] 例外発生の時、errorログを出力すること
- [x] 例外発生の時、Sentry.captureException が呼ばれること

## REDACT_PATHS — PII マスキング (`src/logger/logger.redact.spec.ts`)

- [x] req.headers.authorization が [Redacted] になること
- [x] req.headers.cookie が [Redacted] になること
- [x] req.body.password が [Redacted] になること
- [x] res.headers['set-cookie'] が [Redacted] になること
- [x] lat/lng（位置情報）はマスクされないこと
