# テスト一覧（ツリー形式）

```
apps/api/src/
├── common/
│   └── openapi-examples.spec.ts
│       └── OpenAPI example IDs
│           ├── 用途別の OpenAPI 例示 ID が重複しないこと
│           └── 汎用 ID 例示は投稿 ID 例示と一致すること
├── auth/
│   ├── roles.guard.spec.ts
│   │   └── RolesGuard
│   │       ├── @Roles デコレータがない場合は通す
│   │       ├── ロールが一致する場合は通す
│   │       ├── ロールが一致しない場合は ForbiddenException をスローする
│   │       └── ユーザーが未設定の場合は ForbiddenException をスローする
│   └── throttler.guard.spec.ts
│       └── AppThrottlerGuard
│           └── 制限超過時に日本語メッセージ付き ThrottlerException をスローすること
├── identity/
│   ├── email-hash-migration.spec.ts
│   │   └── migrateEmailHashToHmac
│   │       ├── 基本動作
│   │       │   └── ユーザーが0件の時、全カウントが0の結果を返すこと
│   │       ├── HMACへの更新
│   │       │   ├── SHA256ハッシュのユーザーがHMACに更新されること
│   │       │   └── 既にHMACのユーザーはスキップされること（冪等）
│   │       ├── dry-runモード
│   │       │   └── dry-runの時、DBを更新せず結果のみ返すこと
│   │       ├── スキップケース
│   │       │   ├── emailEncryptedがnullのユーザーはスキップされること
│   │       │   └── 復号に失敗したユーザーはエラーカウントされること
│   │       └── 複数ユーザー混在
│   │           └── SHA256・HMAC済み・null混在の時、それぞれ正しくカウントされること
│   ├── key-versioning-migration.spec.ts
│   │   └── migrateKeyVersioning
│   │       ├── 基本動作
│   │       │   └── ユーザーが0件の時、全カウントが0の結果を返すこと
│   │       ├── プレフィックス付与
│   │       │   ├── 旧形式（iv:enc:tag）の暗号文にv1プレフィックスを付与すること
│   │       │   ├── 既にv1プレフィックス付きの暗号文はスキップされること（冪等）
│   │       │   └── emailEncryptedがnullのユーザーはスキップされること
│   │       ├── dry-runモード
│   │       │   └── dry-runの時、DBを更新せず変換件数のみ返すこと
│   │       ├── エラーハンドリング
│   │       │   ├── DB更新が失敗した場合にエラーカウントされること
│   │       │   └── 無効なフォーマット（パーツ数が3以外）はエラーカウントされること
│   │       └── 複数ユーザー混在
│   │           └── 旧形式・新形式・null混在の時それぞれ正しくカウントされること
│   ├── identity.service.spec.ts
│   │   └── IdentityService
│   │       ├── login
│   │       │   ├── 正しいメールとパスワードでAuthResultを返すこと
│   │       │   ├── DBにはtokenHashが保存され、平文トークンは保存されないこと
│   │       │   ├── パスワード不一致でUnauthorizedExceptionを投げること
│   │       │   ├── 存在しないメールアドレスでUnauthorizedExceptionを投げること
│   │       │   ├── HMACのみで検索し、SHA256フォールバックを行わないこと
│   │       │   ├── production環境ではCookieのsecureとsameSiteが適切に設定されること
│   │       │   ├── ログイン成功時に auth.login.success イベントをログ出力すること
│   │       │   ├── パスワード不一致時に auth.login.failure イベントをログ出力すること
│   │       │   └── メールアドレス未登録時に auth.login.failure イベントをログ出力すること
│   │       ├── refresh
│   │       │   ├── 有効なトークンで新しいAuthResultを返すこと
│   │       │   ├── トークンが存在しない場合はUnauthorizedExceptionを投げること
│   │       │   ├── 期限切れトークンはUnauthorizedExceptionを投げること
│   │       │   ├── ローテーション: 新しいトークンのハッシュがDBに保存されること
│   │       │   ├── 再利用検知: delete失敗時にUnauthorizedExceptionを投げること
│   │       │   ├── リフレッシュ成功時に auth.refresh.success イベントをログ出力すること
│   │       │   └── 再利用検知時に auth.refresh.reuse イベントをログ出力すること
│   │       ├── logout
│   │       │   ├── リフレッシュトークンを削除すること
│   │       │   ├── 存在しないトークンでもエラーを投げないこと
│   │       │   ├── ログアウト成功時に auth.logout イベントをログ出力すること
│   │       │   └── 存在しないトークンのログアウトではログ出力しないこと
│   │       ├── register
│   │       │   ├── 正常にユーザーを登録しUserDtoを返すこと
│   │       │   ├── メールアドレス重複でConflictExceptionを投げること
│   │       │   ├── ニックネーム重複でConflictExceptionを投げること
│   │       │   └── 登録成功時に auth.register.success イベントをログ出力すること
│   │       ├── findAll
│   │       │   └── 全ユーザーをパスワードなしで返すこと
│   │       └── deleteUser
│   │           └── ユーザーを削除しUserDtoを返すこと
│   └── crypto.service.spec.ts
│       └── CryptoService
│           ├── normalizeEmail
│           │   ├── 大文字を小文字にし、前後空白を除去すること
│           │   └── 既に正規化済みのメールアドレスはそのまま返すこと
│           ├── encryptEmail / decryptEmail
│           │   ├── 暗号化して復号すると元のメールアドレスに戻ること
│           │   ├── 暗号文が keyId:iv:enc:tag の4パーツフォーマットであること
│           │   ├── 復号: 壊れたデータは null を返すこと
│           │   ├── 復号: 存在しない keyId の暗号文は null を返すこと
│           │   └── 復号: 旧形式（3パーツ）の暗号文は null を返すこと
│           ├── 複数鍵サポート
│           │   ├── ENCRYPTION_KEY_CURRENTがv2の時、暗号化結果がv2プレフィックスを持つこと
│           │   ├── v2で暗号化したデータをv2鍵で復号できること
│           │   └── v1で暗号化したデータをv1鍵で復号できること（v2が現在鍵でも）
│           ├── 鍵バージョニングバリデーション
│           │   ├── 32バイト未満のbase64キーはエラーになること
│           │   ├── 32バイト超のbase64キーはエラーになること
│           │   ├── 正しい32バイトbase64キーは正常に動作すること
│           │   ├── onModuleInit で不正キーがあれば起動時にエラーになること
│           │   └── ENCRYPTION_KEY_CURRENTが存在しない鍵IDを指す場合にエラーになること
│           ├── hmacEmail
│           │   ├── 同じ入力に対して同じHMACを生成すること（決定性）
│           │   ├── 異なる入力に対して異なるHMACを生成すること
│           │   └── 正規化されたメールアドレスに対してのみ使われること
│           ├── sha256Hex
│           │   ├── 同じ入力に対して同じハッシュを生成すること
│           │   ├── 異なる入力に対して異なるハッシュを生成すること
│           │   └── SHA256ハッシュは64文字の16進数であること
│           └── generateSecureToken
│               ├── 96文字の16進数文字列を生成すること (48 bytes)
│               └── 毎回異なるトークンを生成すること
├── sentry/
│   └── sentry.filter.spec.ts
│       └── SentryFilter
│           ├── 5xx エラーの時、Sentry.captureException が呼ばれること
│           ├── 4xx HttpException の時、Sentry.captureException が呼ばれないこと
│           └── HttpException 以外の Error の時、Sentry.captureException が呼ばれること
├── health/
│   └── health.controller.spec.ts
│       └── HealthController
│           └── check()
│               ├── 全チェックが正常なとき、status:okを返すこと
│               ├── DBが異常なとき、status:errorを返すこと
│               └── check()はHealthCheckService.check()を呼び出すこと
├── posts/
│   ├── image-processing.service.spec.ts
│   │   ├── processが処理済みBufferを返すこと
│   │   ├── width=1200・withoutEnlargement=true でリサイズすること
│   │   ├── quality=80 でJPEG変換すること
│   │   └── sharpがエラーをスローした時、BadRequestExceptionになること
│   ├── file-storage.service.spec.ts
│   │   ├── saveFile
│   │   │   ├── saveFileが uploads/{postId}/{uuid}.jpg 形式のURLを返すこと
│   │   │   ├── saveFileがwriteFileSyncを呼ぶこと
│   │   │   ├── ディレクトリが存在しない時、mkdirSyncを呼ぶこと
│   │   │   ├── ディレクトリが存在する時、mkdirSyncを呼ばないこと
│   │   │   ├── imageProcessing.processに入力Bufferを渡すこと
│   │   │   ├── 保存ファイル名がUUID v4 + .jpg 形式になること
│   │   │   ├── 元のファイル名（originalname）が保存パスに含まれないこと
│   │   │   └── imageProcessingがエラーをスローした時、BadRequestExceptionが伝播すること
│   │   └── deleteFile
│   │       ├── ファイルが存在する時、unlinkSyncを呼ぶこと
│   │       └── ファイルが存在しない場合、unlinkSyncを呼ばないこと
│   ├── post.service.spec.ts
│   │   ├── findAll
│   │   │   ├── ページ1・perPage5 で skip=0 / take=5 を渡す
│   │   │   ├── ページ3・perPage5 で skip=10 を渡す
│   │   │   └── items と total を返し、投稿者名を authorNickname に詰める
│   │   ├── findById
│   │   │   └── petDetail/location/images と user.nickname を取得し authorNickname を返す
│   │   ├── create
│   │   │   ├── ファイルなしで投稿を作成する
│   │   │   ├── postType 未指定の時、cat で保存して返す
│   │   │   ├── ファイルありで投稿を作成する時、fileStorageService.saveFileが呼ばれること
│   │   │   ├── 元のファイルの拡張子に関わらず保存拡張子が .jpg になること
│   │   │   ├── 無料プランの画像が3枚を超えると ForbiddenException をスローする
│   │   │   ├── premium ユーザーは画像を10枚まで添付できる
│   │   │   ├── 画像処理でSharpエラーが発生した場合 BadRequestException をスローする
│   │   │   ├── petDetail と location を含む時、トランザクションで一括作成する
│   │   │   ├── lostDate を指定して作成できる
│   │   │   ├── 無料プランの画像が4枚を超えると ForbiddenException をスローする
│   │   │   ├── 無料プランの月間投稿数が3件に達している時は ForbiddenException をスローする
│   │   │   ├── 月間投稿数の集計は UTC 境界で判定する
│   │   │   ├── トランザクション競合時は再試行して投稿を作成する
│   │   │   ├── 翌月になると無料プランの投稿数はリセットされる
│   │   │   └── premium ユーザーは月間投稿数の制限を受けない
│   │   ├── addImages
│   │   │   ├── 画像を追加できる
│   │   │   ├── 無料プランで追加後の合計が3枚を超えると ForbiddenException
│   │   │   ├── premium ユーザーは10枚まで追加できる
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は NotFoundException
│   │   │   └── DB作成失敗時に保存済みファイルを削除する
│   │   ├── removeImage
│   │   │   ├── オーナーが画像を削除できる
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は NotFoundException
│   │   │   └── 別の投稿に属する画像は NotFoundException
│   │   ├── update
│   │   │   ├── オーナーが更新できる
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は HttpException (404)
│   │   │   ├── lostDate を更新できる
│   │   │   ├── status を更新できる
│   │   │   ├── postType を更新できる
│   │   │   ├── petDetail を upsert できる
│   │   │   └── location を upsert できる
│   │   ├── dto
│   │   │   ├── postType が未指定のときはバリデーションは通ること
│   │   │   └── postType が null のときはバリデーションエラーになること
│   │   └── remove
│   │       ├── オーナーが削除できる
│   │       ├── 画像ファイルも削除する
│   │       ├── オーナー以外は ForbiddenException
│   │       ├── 存在しない投稿は HttpException (404)
│   │       └── 管理者は他人の投稿を削除できる
│   │   └── toggleFavorite
│   │       ├── お気に入りしていない状態でtoggleFavoriteを呼ぶと { favorited: true } を返す
│   │       ├── 既にお気に入り済みの状態でtoggleFavoriteを呼ぶと { favorited: false } を返す
│   │       ├── 自分の投稿をお気に入りしようとすると ForbiddenException
│   │       ├── お気に入りが20件の状態でtoggleFavoriteを呼ぶと BadRequestException
│   │       └── 存在しない投稿をお気に入りしようとすると NotFoundException
│   └── post.controller.spec.ts
│       ├── list
│       │   ├── デフォルト（page=1, perPage=10）で findAll を呼ぶ
│       │   ├── 文字列クエリを数値に変換して渡す
│       │   ├── 不正な文字列は 1 / 10 にフォールバックする
│       │   └── items と total を返す
│       ├── get
│       │   └── 指定 ID の投稿を返す
│       ├── create
│       │   ├── dto と files をサービスに渡す
│       │   ├── ファイル付きで作成できる
│       │   ├── files が undefined の時は空配列を渡す
│       │   └── petDetail と location を含む dto をサービスに渡す
│       ├── update
│       │   ├── オーナーが更新できる
│       │   ├── オーナー以外は ForbiddenException を伝播する
│       │   ├── 存在しない投稿は HttpException を伝播する
│       │   └── petDetail と location を含む dto をサービスに渡す
│       ├── addImages
│       │   ├── 画像を追加できる
│       │   ├── files が undefined の時は空配列を渡す
│       │   ├── オーナー以外は ForbiddenException を伝播する
│       │   └── 枚数超過は BadRequestException を伝播する
│       ├── removeImage
│       │   ├── オーナーが画像を削除できる
│       │   ├── オーナー以外は ForbiddenException を伝播する
│       │   └── 存在しない画像は NotFoundException を伝播する
│       ├── imageFileFilter
│       │   ├── fileがnullの時、cb(null, false)を呼ぶこと
│       │   ├── originalnameがない時、cb(null, false)を呼ぶこと
│       │   ├── 許可されたMIMEタイプの時、cb(null, true)を呼ぶこと
│       │   └── 許可されていないMIMEタイプの時、BadRequestExceptionを渡すこと
│       ├── toggleFavorite
│       │   ├── { favorited: true } を返す
│       │   ├── ForbiddenException を伝播する
│       │   └── BadRequestException を伝播する
│       └── remove
│           ├── オーナーが削除できる
│           ├── オーナー以外は ForbiddenException を伝播する
│           └── 存在しない投稿は HttpException を伝播する
├── map/
│   └── map.service.spec.ts
│       └── getMarkers
│           ├── bbox内のPostマーカーが type='post' で返ること
│           ├── bbox内のSightingマーカーが type='sighting' で返ること
│           ├── standalone Sighting は statusなしで lost として返ること
│           ├── statusフィルタ指定時にPostクエリのwhereにstatusが含まれること
│           ├── statusフィルタ指定時にSightingクエリのwhereにpost.statusが含まれること
│           ├── bboxクエリ条件がPostのlocation.lat/lngフィルタとして渡ること
│           ├── bboxクエリ条件がSightingのlat/lngフィルタとして渡ること
│           ├── bboxクエリが文字列でも数値フィルタとして渡ること
│           ├── 空白文字列と非有限数はbboxフィルタに含めないこと
│           └── フィルタなしで全マーカー（Post+Sighting）が返ること
├── conversations/
│   ├── dto/
│   │   └── create-message.dto.spec.ts
│   │       ├── bodyもimageUrlも両方nullの場合、バリデーションエラーになること
│   │       ├── bodyのみ指定でバリデーションが通過すること
│   │       ├── imageUrlのみ指定でバリデーションが通過すること
│   │       ├── bodyとimageUrl両方指定でバリデーションが通過すること
│   │       └── bodyが1000文字を超える場合はバリデーションエラーになること
│   ├── conversation.service.spec.ts
│   │   ├── create
│   │   │   ├── 有効なデータで会話を作成できること
│   │   │   ├── 同一postId+sightingIdの会話は既存の会話を返すこと
│   │   │   ├── 存在しないpostIdはNotFoundException
│   │   │   ├── 存在しないsightingIdはNotFoundException
│   │   │   └── 会話参加者以外（無関係なユーザー）はForbiddenException
│   │   │   └── standalone Sighting は NotFoundException で会話を作成できないこと
│   │   ├── findAllForUser
│   │   │   ├── 自分がownerまたはsighterとして参加する会話一覧をinclude付きで取得すること
│   │   │   ├── ownerの場合は相手（sighter）のニックネームをpartnerNicknameとして返すこと
│   │   │   └── sighterの場合は相手（owner）のニックネームをpartnerNicknameとして返すこと
│   │   ├── createMessage
│   │   │   ├── 会話参加者がメッセージを送信できること
│   │   │   ├── bodyが1000文字超過はBadRequestException
│   │   │   ├── 会話参加者以外のメッセージ送信はForbiddenException
│   │   │   ├── 存在しない会話へのメッセージはNotFoundException
│   │   │   ├── imageUrlのみ指定でメッセージを送信できること
│   │   │   └── bodyとimageUrl両方指定でメッセージを送信できること
│   │   ├── findMessages
│   │   │   ├── 会話参加者がメッセージ一覧を取得できること
│   │   │   ├── 会話参加者以外のメッセージ一覧取得はForbiddenException
│   │   │   └── 存在しない会話のメッセージ一覧はNotFoundException
│   │   ├── findOneForUser
│   │   │   ├── 投稿者が会話を取得すると相手は目撃者のニックネームであること
│   │   │   ├── 目撃者が会話を取得すると相手は投稿者のニックネームであること
│   │   │   └── 参加者以外が会話を取得するとNotFoundException
│   │   ├── markAsRead
│   │   │   ├── 相手が送ったunreadメッセージをすべて既読にすること
│   │   │   ├── 会話参加者以外はForbiddenException
│   │   │   └── 存在しない会話はNotFoundException
│   │   └── getUnreadCount
│   │       ├── ユーザーの全未読メッセージ数を返すこと
│   │       └── 未読メッセージがない場合は 0 を返すこと
│   ├── conversations.gateway.spec.ts
│   │   ├── handleConnection
│   │   │   ├── トークンなしで接続した場合は切断される
│   │   │   ├── 無効なトークンで接続した場合は切断される
│   │   │   ├── 有効なトークンで接続した場合はsocket.data.userIdが設定される
│   │   │   └── Authorizationヘッダー（Bearer形式）でも認証できる
│   │   ├── JWT 再検証
│   │   │   ├── joinConversation 時にトークンが期限切れの場合は切断されること
│   │   │   └── leaveConversation 時にトークンが期限切れの場合は切断されること
│   │   ├── handleJoin
│   │   │   ├── userIdがない場合は切断されjoinしない
│   │   │   ├── 会話参加権限がない場合は切断されjoinしない
│   │   │   ├── 会話が存在しない場合は切断されjoinしない
│   │   │   └── 会話参加権限がある場合は指定した会話ルームにjoinすること
│   │   ├── handleLeave
│   │   │   ├── userIdがない場合は切断されleaveしない
│   │   │   └── userIdがある場合は指定した会話ルームからleaveすること
│   │   ├── handleDisconnect
│   │   │   ├── 切断時に userSocketMap から該当エントリが削除されること
│   │   │   └── 別のソケットで上書きされている場合は削除しないこと
    │   │   ├── 定期JWT検証
    │   │   │   ├── トークンが期限切れの場合、60秒後に定期チェックで切断されること
    │   │   │   ├── 有効なトークンを保持している場合、60秒経過後も切断されないこと
    │   │   │   └── 切断時に定期チェックのタイマーが解除されること
    │   │   ├── refreshToken
    │   │   │   ├── 有効なトークンで client.data.token が更新され、tokenRefreshed が emit されること
    │   │   │   ├── 無効なトークンで tokenRefreshed の失敗が emit されること
    │   │   │   └── Bearer プレフィックス付きトークンも処理できること
    │   │   └── broadcastMessage
    │   │       └── 最小化されたペイロードのみemitする（readAtを含まない）
│   └── conversation.controller.spec.ts
│       ├── createMessage
│       │   ├── メッセージ作成後にbroadcastMessageを呼び出すこと
│       │   └── サービスが例外を投げた場合はbroadcastMessageを呼ばないこと
│       ├── markAsRead
│       │   └── 既読更新結果を返すこと
│       └── getUnreadCount
│           └── ユーザーの未読メッセージ数を返すこと
├── sightings/
│   ├── dto/
│   │   └── create-sighting.dto.spec.ts
│   │       └── CreateSightingDto
│   │           ├── postId がなくてもバリデーションエラーにならないこと
│   │           └── postId が空文字のときはバリデーションエラーになること
│   ├── sighting.service.spec.ts
│   │   ├── create
│   │   │   ├── 有効なデータでSightingを作成できること
│   │   │   ├── postId がない時は Post チェックをスキップして Sighting を作成できること
│   │   │   ├── postId が空文字の時は Post チェックを行って NotFoundException になること
│   │   │   ├── 投稿者本人が自分のPostにSightingを作成しようとすると ForbiddenException
│   │   │   └── 存在しないPostにSightingを作成しようとすると NotFoundException
│   │   ├── findByPost
│   │   │   └── postIdに紐づくSighting一覧をcreatedAt降順で返すこと
│   │   ├── findOne
│   │   │   ├── 指定IDの目撃情報を報告者のニックネーム付きで返すこと
│   │   │   └── 存在しないIDを指定するとNotFoundExceptionを送出すること
│   │   ├── remove
│   │   │   ├── 本人がSightingを削除できること
│   │   │   ├── 他者が削除しようとすると ForbiddenException
│   │   │   ├── 存在しないSightingを削除しようとすると NotFoundException
│   │   │   └── 管理者は他者のSightingを削除できること
│   │   └── toggleFavorite
│   │       ├── お気に入りしていない状態でtoggleFavoriteを呼ぶと { favorited: true } を返す
│   │       ├── 既にお気に入り済みの状態でtoggleFavoriteを呼ぶと { favorited: false } を返す
│   │       ├── お気に入りが20件の状態でtoggleFavoriteを呼ぶと BadRequestException
│   │       └── 存在しないSightingをお気に入りしようとすると NotFoundException
│   └── sighting.controller.spec.ts
│       ├── create
│       │   └── 目撃情報を作成してサービスの結果を返すこと
│       ├── findByPost
│       │   └── postIdに紐づく目撃情報一覧を返すこと
│       ├── findOne
│       │   ├── 指定IDの目撃詳細を返すこと
│       │   └── NotFoundException を伝播する
│       ├── remove
│       │   ├── 目撃情報を削除してサービスの結果を返すこと
│       │   └── ForbiddenException を伝播する
│       └── toggleFavorite
│           ├── { favorited: true } を返す
│           ├── { favorited: false } を返す（解除）
│           ├── BadRequestException を伝播する
│           └── NotFoundException を伝播する
└── users/
    ├── user.controller.spec.ts
    │   └── UsersController
    │       ├── nickname と name がないと BadRequestException を返す
    │       ├── ConflictException はそのまま伝播する
    │       ├── nickname があれば service に渡す
    │       ├── nickname がなくても name を後方互換で使う
    │       └── remove
    │           ├── 管理者がユーザーを削除できる
    │           ├── 存在しないユーザーIDはP2025エラーを404に変換する
    │           └── P2025以外のエラーは再スローされる
    └── dto/
        └── register.dto.spec.ts
            └── RegisterDto
                ├── name が未指定でもバリデーションは通る
                ├── nickname が未指定でもバリデーションは通る
                └── name と nickname があればバリデーションは通る

apps/api/
└── Dredd 契約テスト
    └── packages/api-client/openapi.json と API 実装の契約を hook 経由で検証する

apps/api/test/
├── health.e2e.ts
│   ├── GET /api/health 正常系
│   │   ├── DBとディスクとuploadsが正常なとき、200とstatus:okを返すこと
│   │   └── 認証なしでアクセスできること
│   └── GET /api/health 異常系
│       └── DB切断時に503を返すこと
├── throttler.e2e.ts
│   ├── POST /api/auth/login のレート制限
│   │   ├── 制限内（2回）は 401 が返ること（認証失敗だがレート制限ではない）
│   │   └── 制限超過（3回目）は 429 と日本語エラーメッセージが返ること
│   └── POST /api/users/register のレート制限
│       ├── 制限内（2回）は登録成功または重複エラーが返ること（429 ではない）
│       └── 制限超過（3回目）は 429 と日本語エラーメッセージが返ること
└── app.e2e.ts
    ├── POST /api/users/register
    │   ├── オーナーユーザーを登録できる (201)
    │   ├── 非オーナーユーザーを登録できる (201)
    │   ├── name が未指定のとき 400 を返す
    │   ├── name が空文字のとき 400 を返す
    │   ├── 重複メールは 400 を返す
    │   ├── 重複 nickname で 409 を返す
    │   └── 短すぎるパスワードは 400 を返す
    ├── POST /api/auth/login
    │   ├── オーナー: accessToken と refreshToken cookie を返す (200)
    │   ├── JWT ペイロードに sub / email / role が含まれること
    │   ├── 非オーナー: accessToken を返す (200)
    │   ├── 誤パスワード（8文字以上）は 401 を返す
    │   ├── 存在しないメールアドレスは 401 を返す
    │   ├── 不正なメール形式は 400 を返す
    │   ├── 8文字未満のパスワードは 400 を返す
    │   ├── 必須フィールド不足は 400 を返す
    │   └── mail 欠落のフィールドのみ指定しても 400 を返す
    ├── POST /api/posts
    │   ├── 認証済みで投稿を作成できる (201)
    │   └── 未認証は 401 を返す
    ├── GET /api/posts
    │   ├── ゲストでも一覧を取得できる (200)
    │   └── page / perPage クエリが機能する
    ├── GET /api/posts/:id
    │   └── ゲストでも詳細を取得できる (200)
    ├── PATCH /api/posts/:id
    │   ├── 未認証は 401 を返す
    │   ├── 非オーナーは 403 を返す
    │   └── オーナーは更新できる (200)
    ├── POST /api/posts/:id/images
    │   ├── 未認証は 401 を返す
    │   ├── 非オーナーは 403 を返す
    │   └── オーナーは画像をアップロードできる (201)
    ├── DELETE /api/posts/:id/images/:imageId
    │   ├── 未認証は 401 を返す
    │   ├── 非オーナーは 403 を返す
    │   └── オーナーは画像を削除できる (200)
    ├── DELETE /api/posts/:id
    │   ├── 未認証は 401 を返す
    │   ├── 非オーナーは 403 を返す
    │   ├── オーナーは削除できる (200)
    │   └── 存在しない投稿は 404 を返す
    ├── POST /api/auth/refresh
    │   ├── 有効な refreshToken で新しい accessToken を返す (200)
    │   └── Cookie なしは 401 を返す
    └── POST /api/auth/logout
        └── ログアウトで Cookie が削除される (200)
apps/web/src/
├── App.test.tsx
│   └── App
│       ├── 未認証で /posts にアクセスしたとき、Posts ページが表示されること
│       └── 未認証で /create にアクセスしたとき、/login にリダイレクトされること
├── CreatePost.test.tsx
│   └── CreatePost
│       ├── 必須項目を入力して送信した時、lostDate を正規化して cat投稿として作成し一覧へ遷移すること
│       ├── 投稿APIが失敗した時、エラートーストを表示して遷移しないこと
│       ├── 埋め込み地図が表示されず、地図ピッカー起動ボタンが表示されること
│       ├── 地図ピッカー起動ボタンをクリックするとフルスクリーンピッカーが開くこと
│       └── ピッカー内で「この場所に決める」を押すとピッカーが閉じて座標が表示されること
├── Map.test.tsx
    │   └── Map
    │       ├── 地図ページを開いた時、検索バーと種別フィルターが表示されること
    │       ├── 迷い猫投稿を押すと /create に遷移すること
    │       ├── 迷子マーカーを押した時、詳細シートが開くこと
    │       ├── 目撃マーカーを押した時、目撃情報シートが開くこと
    │       ├── 迷子フィルターを押した時、迷子マーカーだけが表示されること
    │       ├── 現在地ボタンを押すと現在地へ移動すること
    │       ├── アカウントボタン
    │       │   ├── 未認証でクリックした時、ログアウト確認ダイアログが表示されないこと
    │       │   ├── 認証済みでクリックした時、ログアウト確認ダイアログが表示されること
    │       │   ├── ダイアログでキャンセル押下時、ログアウト処理が実行されないこと
    │       │   └── ダイアログでOK押下時、ログアウト処理が実行されること
    │       ├── 目撃を報告するボタン
    │       │   ├── 未認証でボタンをクリックした時、/loginにリダイレクトされること
    │       │   └── 認証済みかつ他者のPostでボタンをクリックした時、SightingModalが開くこと
    │       ├── 目撃投稿ボタン（BottomBar）
    │       │   ├── 未認証で「目撃投稿」ボタンをクリックした時、/loginにリダイレクトされること
    │       │   └── 認証済みで「目撃投稿」ボタンをクリックした時、SightingModalが開くこと
    │       └── 地図から選択モード
    │           ├── 「地図から選択」クリック後、「タップして場所を選択」バナーが表示されること
    │           ├── 選択モード中に地図クリックで lat/lng・住所が SightingModal にセットされ再表示されること
    │           └── Nominatim 失敗時、lat/lng セット済みでモーダルが再表示されエラーメッセージが表示されること
    ├── components/PostDetailSheet.test.tsx
    │   └── PostDetailSheet
    │       ├── isOpen=true の時、ダイアログが表示されること
    │       ├── isLoading=true の時、ローディングが表示されること
    │       ├── status=lost の時、迷子バッジが表示されること
    │       ├── status=resolved の時、解決済みバッジが表示されること
    │       ├── markerType=post の時、迷い猫投稿タイトルが表示されること
    │       ├── markerType=sighting の時、目撃情報タイトルが表示されること
    │       ├── petDetail がある時、詳細情報が表示されること
    │       ├── petDetail が null の時、特徴セクションが表示されないこと
    │       ├── location がある時、住所が表示されること
    │       ├── location が null の時、場所セクションが表示されないこと
    │       ├── 画像がある時、1枚目の画像が表示されること
    │       ├── 画像がない時、プレースホルダーが表示されること
    │       ├── 画像が複数枚ある時、すべての画像がカルーセルとして表示されること
    │       ├── 画像が1枚のみの時、ドットインジケーターが表示されないこと
    │       ├── 画像が複数枚の時、ドットインジケーターが表示されること
    │       ├── 閉じるボタンを押した時、onClose が呼ばれること
    │       ├── 目撃を報告するボタン
    │       │   ├── markerType=post かつ他者のPost の時、ボタンが表示されること
    │       │   ├── 未認証（currentUserId=null）の時、ボタンが表示されること
    │       │   ├── 自分がPost投稿者の時、ボタンが非表示であること
    │       │   ├── markerType=sighting の時、ボタンが非表示であること
    │       │   └── ボタンを押した時、onReportSighting が postId で呼ばれること
    │       ├── メッセージを送るボタン
    │       │   ├── ログイン済みかつ自分がSighting投稿者かつPost投稿者でない時、ボタンが表示されること
    │       │   ├── currentUserIdが未指定（未ログイン）の時、ボタンが非表示であること
    │       │   ├── 自分がPost投稿者の時、ボタンが非表示であること
    │       │   ├── 自分がSighting投稿者でない時、ボタンが非表示であること
    │       │   ├── markerType=postの時、ボタンが非表示であること
    │       │   └── ボタンを押した時、onSendMessageが呼ばれること
    │       └── 編集ボタン
    │           ├── markerType=post かつ自分の投稿の時、編集ボタンが表示されること
    │           ├── 他人の投稿の時、編集ボタンが非表示であること
    │           └── 編集ボタンをクリックした時、onEdit が postId で呼ばれること
    ├── components/SightingList.test.tsx
    │   └── SightingList
    │       ├── ローディング中は読み込み中テキストが表示されること
    │       ├── Sighting が 0 件の時、空状態メッセージが表示されること
    │       ├── Sighting 一覧に sightedAt・address・comment が表示されること
    │       ├── 自分の Sighting にのみ削除ボタンが表示されること
    │       ├── 他人の Sighting には削除ボタンが表示されないこと
    │       ├── 削除ボタン押下で AlertDialog が表示されること
    │       ├── AlertDialog 確認で deleteSighting が呼ばれること
    │       ├── 削除成功後に onSightingDeleted コールバックが呼ばれること
    │       ├── 削除処理中は確認ダイアログの削除ボタンが無効化されること
    │       └── 削除 API が失敗した時、エラーメッセージが表示されること
    ├── components/SightingModal.test.tsx
    │   └── SightingModal
    │       ├── isOpen=true の時、フォームが表示されること
    │       ├── postId が渡された時、postId フィールドが非表示であること
    │       ├── 必須項目を入力して送信すると、createSighting が正しく呼ばれること
    │       ├── 必須項目未入力で送信しても、createSighting が呼ばれないこと
    │       ├── 閉じるボタンを押した時、onClose が呼ばれること
    │       ├── 緯度が数値でない時、エラーメッセージが表示されること
    │       ├── postId なしで送信すると、postId を含まずに createSighting が呼ばれること
    │       └── 地図から選択
    │           ├── 「地図から選択」ボタンが表示されること（postId あり・なし両方）
    │           ├── 「地図から選択」クリックで onSelectFromMap が呼ばれること
    │           ├── pickedLocation が更新された時、lat/lng/address フィールドに反映されること
    │           ├── pickedLocation に geocodeError がある時、エラーメッセージが表示されること
    │           └── forceMount 時、isOpen=false → true でフォーム値が保持されること
    ├── lib/reverseGeocode.test.ts
    │   └── reverseGeocode
    │       ├── 正常時、Nominatim から住所文字列を返すこと
    │       ├── HTTP エラー時、geocodeError を返すこと
    │       └── ネットワークエラー時、geocodeError を返すこと
    ├── EditPost.test.tsx
    │   └── EditPost
    │       ├── 投稿データ取得後、petDetail を含むフォームに初期値がセットされること
    │       ├── 変更して保存した時、updatePost が petDetail/location を含むデータで呼ばれること
    │       ├── 削除ボタンをクリックした時、確認ダイアログが表示されること
    │       ├── 削除ダイアログで「削除を確定する」を押した時、deletePost が呼ばれ / にリダイレクトされること
    │       ├── 削除ダイアログで「キャンセル」を押した時、deletePost が呼ばれないこと
    │       ├── 既存画像がサムネイル表示されること
    │       ├── 既存画像の個別削除ボタンをクリックした時、deleteImage が imageId で呼ばれること
    │       ├── 画像追加アップロードで addImages が呼ばれること
    │       ├── remainingSlots=0 の時、追加アップロードボタンが非表示になること
    │       └── remainingSlots を超える枚数を選択した時、エラーメッセージが表示され addImages が呼ばれないこと
    ├── Conversations.test.tsx
    │   └── Conversations
    │       ├── 会話一覧の表示
    │       │   ├── 会話一覧が表示される時、相手ニックネームと投稿タイトルが表示されること
    │       │   ├── lastMessageがある時、最新メッセージ本文が表示されること
    │       │   ├── lastMessageがない時、メッセージなし文言が表示されること
    │       │   ├── ローディング中はスピナー表示されること
    │       │   ├── 会話がない時は空メッセージが表示されること
    │       │   └── 取得エラーの時、エラーメッセージが表示されること
    │       ├── 未読バッジ
    │       │   ├── unreadCountが1以上の時、未読バッジが表示されること
    │       │   ├── unreadCountが1以上の時、未読バッジが青色の丸スタイルで表示されること
    │       │   └── unreadCountが0の時、未読バッジが表示されないこと
    │       ├── ナビゲーション
    │       │   ├── ← Map ボタンをクリックした時、/ に遷移すること
    │       │   └── 会話セルをクリックした時、/conversations/:idへ遷移すること
    │       └── ポーリング設定
    │           ├── 5秒間隔でポーリングするようにuseQueryが呼ばれること
    │           └── エラー時はポーリングが停止すること
    └── formatDate
        ├── 1分未満の時、「今」を返すこと
        ├── 1分の時、「1分前」を返すこと
        ├── 59分の時、「59分前」を返すこと
        ├── 60分（1時間）の時、「1時間前」を返すこと
        ├── 23時間の時、「23時間前」を返すこと
        ├── 24時間（1日）の時、「1日前」を返すこと
        ├── 6日の時、「6日前」を返すこと
        ├── 7日以上の時、年/月/日形式で返すこと
        └── 年またぎの時、年情報が含まれること
    ├── components/Layout.test.tsx
    │   └── Layout
    │       ├── アウトレットの子ルートがレンダリングされること
    │       ├── ボトムタブが表示されること
    │       ├── /login パスではタブバーが表示されないこと
    │       ├── /register パスではタブバーが表示されないこと
    │       ├── authRequired タブ
    │       │   ├── 未認証時は /login への誘導リンクが表示されること
    │       │   └── 認証時はタブ本来のリンク先が表示され、現在パスならハイライトされること
    │       └── authOnly タブ
    │           ├── 未認証時は表示されないこと
    │           └── 認証時は表示されること
    ├── components/ui/drawer.test.tsx
    │   └── Drawer
    │       ├── open=trueの時、子要素が表示されること
    │       ├── open=falseの時、子要素が表示されないこと
    │       ├── snapPointsが反映されること
    │       └── Closeコンポーネントがクリックされた時onOpenChangeが呼ばれること
    ├── ConversationChat.test.tsx
    │   └── ConversationChat
    │       ├── ヘッダー表示
    │       │   ├── ページ開時、相手ニックネームがヘッダーに表示されること
    │       │   ├── ← 会話一覧ボタンをクリックした時、/conversations に遷移すること
    │       │   ├── メッセージリストがスクロール可能な領域であること
    │       │   └── 入力欄が画面下部に固定されていること
    │       ├── メッセージ一覧
    │       │   ├── メッセージ一覧が表示される時、各bodyが表示されること
    │       │   ├── 自分のメッセージには自分用クラスが付くこと
    │       │   ├── 自分のメッセージが右寄せで青色のバブルスタイルであること
    │       │   └── 相手のメッセージが左寄せでグレーのバブルスタイルであること
    │       ├── Socket.io
    │       │   ├── ページ開時に joinConversation イベントが送信されること
    │       │   ├── newMessage イベント受信時、メッセージリストに追加されること
    │       │   ├── disconnect イベント受信時、切断バナーが表示されること
    │       │   ├── 切断バナーはインラインstyleではなくTailwindクラスでスタイルされていること
    │       │   ├── connect イベント受信時、切断バナーが非表示になること
    │       │   ├── connect_error イベント受信時、切断バナーが表示されること
    │       │   └── 再接続時に joinConversation が再送されること
    │       ├── メッセージ送信
    │       │   ├── 送信ボタンクリック時、mutate が呼ばれること
    │       │   └── 1000文字超の入力は送信ボタンが無効になること
    │       ├── 既読処理
    │       │   └── ページを開いた時に markAsRead が呼ばれること
    │       └── ローディング・エラー
    │           ├── メッセージローディング中は「読み込み中...」が統一されたスタイルで表示されること
    │           ├── ローディング表示が統一されたスタイルであること
    │           ├── メッセージ取得エラー時は「メッセージの取得に失敗しました」が統一されたスタイルで表示されること
    │           └── エラー表示が統一されたスタイルであること
    ├── LoginWithAuth.test.tsx
    │   └── LoginWithAuth
    │       ├── フォームが正しくレンダリングされること
    │       ├── パスワード表示トグルで入力欄のtype属性が切り替わること
    │       ├── 正常ログイン時、投稿一覧（/posts）にリダイレクトすること
    │       └── 認証エラー時、フォーム上部にエラーバナーが表示されること
    ├── Register.test.tsx
    │   └── Register
    │       ├── フォームが正しくレンダリングされること（名前は任意、ログインへのリンクあり）
    │       ├── メール形式が不正な時、フィールド下にエラーが表示されること
    │       ├── パスワードが8文字未満の時、フィールド下にエラーが表示されること
    │       ├── パスワードと確認用が一致しない時、フィールド下にエラーが表示されること
    │       └── 正常登録後、ログイン画面（/login）にリダイレクトすること
    └── Posts.test.tsx
        └── Posts
            ├── 読み込み状態
            │   └── データ取得中はローディングスピナーが表示されること
            ├── カードグリッド
            │   ├── 投稿データがカード形式で表示されること
            │   ├── 画像がない時は「画像がありません」と表示されること
            │   └── ペット名がない時は「名前不明」と表示されること
            ├── Infinite Scroll
            │   ├── センチネルが交差した時、次のページをフェッチすること
            │   ├── 追加フェッチ中はローディングスピナーが表示されること
            │   ├── 全件表示後は「これ以上ありません」と表示されること
            │   └── 投稿が0件の時は「投稿がありません」と表示されること
            ├── 削除フロー
            │   ├── Deleteボタンをクリックした時、AlertDialogが表示されること
            │   ├── AlertDialogでキャンセルをクリックした時、削除が実行されないこと
            │   ├── AlertDialogで削除を確認した時、投稿が削除され削除完了トーストが表示されること
            │   └── 削除が失敗した時、エラートーストが表示されること
            ├── Map導線
            │   └── 地図アイコンボタンをクリックした時、/?postId=xxx に遷移すること
            └── ナビゲーション
                └── ← Map ボタンをクリックした時、/ に遷移すること
apps/web/tests/playwright/
└── create-post-map-flow.spec.ts
    └── 画像3枚で迷い猫投稿し、マーカークリックで登録内容が表示されること
apps/api/src/logger/
├── logger.interceptor.spec.ts
│   └── LoggerInterceptor
│       ├── 正常レスポンスの時、method・url・statusCode・durationをログ出力すること
│       ├── 例外発生の時、errorログを出力すること
│       └── 例外発生の時、Sentry.captureException が呼ばれること
└── logger.redact.spec.ts
    └── REDACT_PATHS — PII マスキング
        ├── req.headers.authorization が [Redacted] になること
        ├── req.headers.cookie が [Redacted] になること
        ├── req.body.password が [Redacted] になること
        ├── res.headers['set-cookie'] が [Redacted] になること
        └── lat/lng（位置情報）はマスクされないこと
```
