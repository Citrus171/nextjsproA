# テスト一覧（ツリー形式）

```
tools/k6/
├── lib/
│   ├── thresholds.js    # SLO 定義（エラー率 <1%, p95 read <300ms, p95 auth <800ms）
│   └── auth.js          # login / logout / authParams ヘルパー
├── scenarios/
│   ├── health.js        # GET /api/health — 200 & status:ok
│   ├── auth_flow.js     # login → refresh → logout
│   ├── posts_read.js    # GET /api/posts, GET /api/posts/:id — 200
│   ├── sightings_read.js # GET /api/sightings, GET /api/sightings/:id — 200
│   └── map_markers.js   # GET /api/map/markers — 200
└── main.js              # 全シナリオ統合（setup / teardown 含む）
```

```
apps/api/src/
├── common/
│   ├── error-codes.ts
│   │   └── 40種のエラーコード定数 (E_AUTH_*, E_POST_*, E_USER_*, E_CONV_*, E_SIGHTING_*, E_RESOURCE_*, E_FILE_*, E_IMAGE_*, E_RATE_LIMIT, E_VALIDATION, E_INTERNAL)
│   ├── startup-guard.spec.ts
│   │   └── assertSecrets
│   │       ├── development では何もしない
│   │       ├── NODE_ENV 未設定では何もしない
│   │       ├── 本番かつ JWT_SECRET が未設定なら throw する
│   │       ├── 本番かつ JWT_SECRET が change-me を含むなら throw する
│   │       └── 本番かつ強い JWT_SECRET なら throw しない
│   ├── cors.spec.ts
│   │   └── isOriginAllowed
│   │       ├── 本番環境 (isDev=false)
│   │       │   ├── 許可オリジンからのリクエストを許可すること
│   │       │   ├── origin なしのリクエストを拒否すること
│   │       │   ├── localhost からのリクエストを拒否すること
│   │       │   └── 未知のオリジンを拒否すること
│   │       └── 開発環境 (isDev=true)
│   │           ├── origin なしのリクエストを許可すること
│   │           ├── localhost の任意ポートを許可すること
│   │           ├── 許可オリジンを許可すること
│   │           └── 未知の非 localhost オリジンを拒否すること
│   ├── openapi-examples.spec.ts
│   │   └── OpenAPI example IDs
│   │       ├── 用途別の OpenAPI 例示 ID が重複しないこと
│   │       └── 汎用 ID 例示は投稿 ID 例示と一致すること
│   └── port.spec.ts
│       └── resolvePort
│           ├── 未設定（undefined）の時はデフォルトの 3000 を返すこと
│           ├── 空文字の時はデフォルトの 3000 を返すこと
│           ├── 数値文字列の時はその値を返すこと
│           ├── 非数値文字列の時はデフォルトの 3000 を返すこと
│           ├── 0 以下の時はデフォルトの 3000 を返すこと
│           ├── 65535 を超える時はデフォルトの 3000 を返すこと
│           └── ポート範囲の境界値（1 と 65535）はそのまま返すこと
├── auth/
│   ├── roles.guard.spec.ts
│   │   └── RolesGuard
│   │       ├── @Roles デコレータがない場合は通す
│   │       ├── ロールが一致する場合は通す
│   │       ├── ロールが一致しない場合は ForbiddenException をスローする
│   │       └── ユーザーが未設定の場合は ForbiddenException をスローする
│   ├── throttler.guard.spec.ts
│   │   └── AppThrottlerGuard
│   │       └── 制限超過時に日本語メッセージ付き ThrottlerException をスローすること
│   └── auth.controller.spec.ts
│       └── AuthController
│           └── logout
│               ├── clearCookie が refreshTokenCookieOptions と同じ属性で呼ばれること（非production）
│               ├── clearCookie が refreshTokenCookieOptions と同じ属性で呼ばれること（production）
│               ├── COOKIE_SECURE=false なら production でも secure=false の属性で clearCookie が呼ばれること
│               └── Cookie がなければ clearCookie は属性付きで呼ばれ、logout は呼ばれないこと
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
│   │       │   ├── CookieのmaxAgeが30日（ミリ秒）で設定されること
│   │       │   ├── DBにはtokenHashが保存され、平文トークンは保存されないこと
│   │       │   ├── パスワード不一致でUnauthorizedExceptionを投げること
│   │       │   ├── 存在しないメールアドレスでUnauthorizedExceptionを投げること
│   │       │   ├── HMACのみで検索し、SHA256フォールバックを行わないこと
│   │       │   ├── production環境ではCookieのsecure/sameSite/maxAgeが適切に設定されること
│   │       │   ├── ログイン成功時に auth.login.success イベントをログ出力すること
│   │       │   ├── パスワード不一致時に auth.login.failure イベントをログ出力すること
│   │       │   ├── メールアドレス未登録時に auth.login.failure イベントをログ出力すること
│   │       │   └── ログイン成功時、JWTペイロードにnicknameが含まれること
│   │       ├── refresh
│   │       │   ├── 有効なトークンで新しいAuthResultを返すこと
│   │       │   ├── トークンが存在しない場合はUnauthorizedExceptionを投げること
│   │       │   ├── 期限切れトークンはUnauthorizedExceptionを投げること
│   │       │   ├── ローテーション: 新しいトークンのハッシュがDBに保存されること
│   │       │   ├── 再利用検知: delete失敗時にUnauthorizedExceptionを投げること
│   │       │   ├── リフレッシュ成功時に auth.refresh.success イベントをログ出力すること
│   │       │   ├── 再利用検知時に auth.refresh.reuse イベントをログ出力すること
│   │       │   └── リフレッシュ成功時、JWTペイロードにnicknameが含まれること
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
│   │       ├── deleteUser
│   │       │   └── ユーザーを削除しUserDtoを返すこと
│   │       ├── resolveCookieSecure
│   │       │   ├── COOKIE_SECURE 未設定なら NODE_ENV=production で true を返すこと
│   │       │   ├── COOKIE_SECURE 未設定なら NODE_ENV=development で false を返すこと
│   │       │   ├── COOKIE_SECURE=true なら NODE_ENV=development でも true を返すこと
│   │       │   ├── COOKIE_SECURE=false なら NODE_ENV=production でも false を返すこと
│   │       │   └── COOKIE_SECURE が不正値・空文字なら NODE_ENV 判定にフォールバックすること
│   │       ├── login（COOKIE_SECURE=false × NODE_ENV=production）
│   │       │   └── production でも secure=false / sameSite=lax の Cookie を発行すること
│   │       └── refreshTokenCookieOptions
│   │           ├── 非production環境では secure=false, sameSite=lax を返すこと
│   │           ├── production環境では secure=true, sameSite=none を返すこと
│   │           └── maxAge がミリ秒単位で30日に等しいこと
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
├── filters/
│   ├── prisma-client-exception.filter.spec.ts
│   │   └── PrismaClientExceptionFilter
│   │       ├── P2025（レコード不在）
│   │       │   └── code=E_RESOURCE_NOT_FOUND の NotFoundException に変換すること
│   │       ├── P2002（一意制約違反）
│   │       │   └── code=E_RESOURCE_DUPLICATE の ConflictException に変換すること
│   │       └── 不明なPrismaエラーコード
│   │           └── そのまま再スローすること
│   └── all-exceptions.filter.spec.ts
│       └── AllExceptionsFilter
│           ├── HttpException（文字列メッセージ）の時
│           │   ├── statusCode / code / message を含むエンベロープを返すこと
│           │   ├── 4xx の時 Sentry.captureException が呼ばれないこと
│           │   └── 5xx の時 Sentry.captureException が呼ばれること
│           ├── HttpException（code 付きオブジェクト）の時
│           │   └── 指定された code をそのまま返すこと
│           ├── バリデーションエラー（message が配列）の時
│           │   └── E_VALIDATION コードと details を返すこと
│           ├── HttpException 以外の例外の時
│           │   └── 500 ステータスと E_UNKNOWN を返し、Sentry に送信すること
│           ├── details 付き例外の時
│           │   └── details フィールドを含めて返すこと
│           └── message フィールドが文字列でない場合のフォールバック
│               └── error フィールドを message として使うこと
├── sentry/
│   └── sentry.filter.spec.ts
│       └── SentryFilter
│           ├── 5xx エラーの時、Sentry.captureException が呼ばれること
│           ├── 4xx HttpException の時、Sentry.captureException が呼ばれないこと
│           └── HttpException 以外の Error の時、Sentry.captureException が呼ばれること
├── health/
│   ├── health.controller.spec.ts
│   │   └── HealthController
│   │       └── check()
│   │           ├── 全チェックが正常なとき、status:okを返すこと
│   │           ├── DBが異常なとき、status:errorを返すこと
│   │           ├── check()はHealthCheckService.check()を呼び出すこと
│   │           └── レスポンスにuptime（秒）が含まれること
│   └── prisma-health.indicator.spec.ts
│       └── PrismaHealthIndicator
│           ├── DB が正常なとき、status:up を返すこと
│           ├── DB が異常なとき、HealthCheckError をスローすること
│           └── DB エラー時のステータスに message を含まないこと
├── shared/
│   └── image-processing.service.spec.ts
│       ├── processが処理済みBufferを返すこと
│       ├── width=1200・withoutEnlargement=true でリサイズすること
│       ├── quality=80 でJPEG変換すること
│       └── sharpがエラーをスローした時、BadRequestExceptionになること
├── posts/
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
│   │   │   ├── items と total を返し、投稿者名を authorNickname に詰める
│   │   │   ├── userId 指定時は where に userId を含めて検索する
│   │   │   ├── userId 指定時でもページネーションが正しく機能する
│   │   │   ├── page=0 を渡しても skip=0 (先頭ページ) として処理される
│   │   │   ├── page=-1 を渡しても skip=0 (先頭ページ) として処理される
│   │   │   ├── perPage=-5 かつ page=2 でも skip が負にならず take=1 にクランプされる
│   │   │   ├── perPage=0 でも take=1 にクランプされる
│   │   │   ├── page/perPage が NaN でもデフォルト値 (skip=0, take=10) で処理される
│   │   │   └── page/perPage が小数でも整数に切り捨てて処理される
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
│   │   │   ├── resolved 状態の投稿には画像を追加できない（BadRequestException）
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は NotFoundException
│   │   │   └── DB作成失敗時に保存済みファイルを削除する
│   │   ├── removeImage
│   │   │   ├── オーナーが画像を削除できる
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は NotFoundException
│   │   │   ├── 別の投稿に属する画像は NotFoundException
│   │   │   ├── admin は他ユーザーの投稿画像を削除できる
│   │   │   └── admin でないユーザーが他ユーザーの画像を削除しようとすると ForbiddenException
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
│       │   ├── items と total を返す
│       │   ├── mine=true の時、req.user.id を userId として findAll に渡す
│       │   ├── mine=true でもページネーションが正しく機能する
│       │   └── mine=true 未認証の時、UnauthorizedException をスローする
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
│   ├── map.service.spec.ts
│   │   └── getMarkers
│   │       ├── bbox内のPostマーカーが type='post' で返ること
│   │       ├── bbox内のSightingマーカーが type='sighting' で返ること
│   │       ├── standalone Sighting は statusなしで lost として返ること
│   │       ├── statusフィルタ指定時にPostクエリのwhereにstatusが含まれること
│   │       ├── statusフィルタ指定時にSightingクエリのwhereにpost.statusが含まれること
│   │       ├── bboxクエリ条件がPostのlocation.lat/lngフィルタとして渡ること
│   │       ├── bboxクエリ条件がSightingのlat/lngフィルタとして渡ること
│   │       ├── bboxクエリが文字列でも数値フィルタとして渡ること
│   │       ├── 空白文字列と非有限数はbboxフィルタに含めないこと
│   │       └── フィルタなしで全マーカー（Post+Sighting）が返ること
│   └── map.controller.spec.ts
│       └── getMarkers スロットル設定
│           ├── @SkipThrottle が public に設定されていないこと
│           ├── @SkipThrottle が default に設定されていないこと
│           ├── public スロットルの limit が 600 であること
│           └── public スロットルの ttl が 60000 であること
├── conversations/
│   ├── dto/
│   │   └── create-message.dto.spec.ts
│   │       ├── bodyもなしでもDTOバリデーションは通過すること（空メッセージチェックはサービス層で行う）
│   │       ├── bodyのみ指定でバリデーションが通過すること
│   │       ├── bodyが1000文字を超える場合はバリデーションエラーになること
│   │       └── imageUrlを含む入力を渡してもDTOに imageUrl プロパティが存在しないこと（セキュリティ: 外部URL注入防止）
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
    │   │   │   ├── JWT 再検証インターバルが 15000ms 以下で設定されること
    │   │   │   ├── トークンが期限切れの場合、定期チェックで切断されること
    │   │   │   ├── 有効なトークンを保持している場合、15秒経過後も切断されないこと
    │   │   │   └── 切断時に定期チェックのタイマーが解除されること
    │   │   ├── refreshToken
    │   │   │   ├── 有効なトークンで client.data.token が更新され、tokenRefreshed が emit されること
    │   │   │   ├── 無効なトークンで tokenRefreshed の失敗が emit されること
    │   │   │   └── Bearer プレフィックス付きトークンも処理できること
    │   │   └── broadcastMessage
    │   │       ├── 最小化されたペイロードのみemitする（readAtを含まない）
    │   │       └── imageUrlがある場合はペイロードに含まれること
│   ├── conversation-file-storage.service.spec.ts
│   │   ├── saveFile
│   │   │   ├── 画像を処理してuploads/conversations/{conversationId}/{uuid}.jpgに保存し、URLを返すこと
│   │   │   ├── ディレクトリが存在しない場合はmkdirSyncで作成すること
│   │   │   ├── ディレクトリが既に存在する場合はmkdirSyncを呼ばないこと
│   │   │   └── 不正なconversationIdでパストラバーサルを防ぐこと
│   │   └── deleteFile
│   │       ├── ファイルが存在する場合は削除すること
│   │       ├── ファイルが存在しない場合は何もしないこと
│   │       └── 不正なパスでパストラバーサルを防ぐこと
│   └── conversation.controller.spec.ts
│       ├── createMessage
│       │   ├── ボディに imageUrl を含めても、サービスには imageUrl が渡されないこと（セキュリティ: 外部URL注入防止）
│       │   ├── メッセージ作成後にbroadcastMessageを呼び出すこと
│       │   ├── サービスが例外を投げた場合はbroadcastMessageを呼ばないこと
│       │   ├── 画像ファイルが添付された場合はfileStorageに保存してimageUrlを含むDTOでcreateMessageを呼ぶこと
│       │   ├── ファイルあり・ボディに外部imageUrlを含めても、サーバー生成URLのみがサービスに渡されること（セキュリティ: 外部URL注入防止）
│       │   ├── 未対応のファイル形式（HEIC等）は400エラーになること
│       │   ├── GIF・WebP は許容されること
│       │   └── 20MB超のファイルは400エラーになること
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
│   │   │   └── postIdに紐づくSighting一覧をニックネーム付きで返すこと
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
│           └── deleteUserがエラーを投げたとき、そのエラーが伝播すること
    └── dto/
        └── register.dto.spec.ts
            └── RegisterDto
                ├── name が未指定でもバリデーションは通る
                ├── nickname が未指定でもバリデーションは通る
                ├── name と nickname があればバリデーションは通る
                └── パスワード強度バリデーション
                    ├── 8文字未満はバリデーションエラー
                    ├── 大文字なしはバリデーションエラー
                    ├── 小文字なしはバリデーションエラー
                    ├── 数字なしはバリデーションエラー
                    ├── 記号なしはバリデーションエラー
                    ├── よくある弱いパスワード password123 はエラー
                    ├── 12345678901234 はエラー
                    └── 強いパスワードはバリデーションを通る

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
├── api/client.test.ts
│   ├── createClient
│   │   ├── createClient を呼び出した後、axios.defaults.withCredentials が true になること
│   │   └── baseURL オプション指定時も withCredentials が true になること
│   └── createClient - refreshToken 注入
│       ├── refreshToken が注入されている時、client.refresh() が refreshToken を呼ぶこと（authControllerRefresh は呼ばない）
│       └── refreshToken が未設定の時、client.refresh() が authControllerRefresh を呼ぶこと
├── auth/AuthProvider.test.tsx
│   └── AuthProvider
│       ├── JWTにnicknameが含まれる場合、AuthProviderがnicknameを公開すること
│       ├── nicknameを含まないJWTの場合、nicknameがnullを返すこと
│       ├── refresh() が context 経由で呼び出せること
│       └── refresh() が同時に複数回呼ばれた時、authControllerRefresh は1回だけ呼ばれること
├── App.test.tsx
│   └── App
│       ├── 未認証で /posts にアクセスしたとき、/login にリダイレクトされること
│       ├── 認証済みで /posts にアクセスしたとき、Posts ページが表示されること
│       ├── 未認証で /create にアクセスしたとき、/login にリダイレクトされること
│       └── isRestoring: true の間、PrivateRoute はスピナーを表示すること
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
    │       ├── ヘッダーUI
    │       │   ├── ヘッダーに「さいたまマップ」テキストが表示されること
    │       │   ├── 旧「メニュー」ボタン（≡）が表示されないこと
    │       │   └── 旧「アカウント」ボタン（◯）が表示されないこと
    │       ├── ログアウトボタン
    │       │   ├── 未認証時、ログアウトボタンが表示されないこと
    │       │   ├── 認証済み時、ボトムナビにログアウトアイコンボタンが表示されること
    │       │   ├── 認証済みでクリックした時、ログアウト確認ダイアログが表示されること
    │       │   ├── ダイアログでキャンセル押下時、ログアウト処理が実行されないこと
    │       │   └── ダイアログの実行ボタンが押下時にログアウト処理が実行されること
    │       ├── 自分の投稿ボタン
    │       │   ├── 認証済み時、ボトムナビに「自分の投稿」ボタンが表示されること
    │       │   ├── 未認証時、「自分の投稿」ボタンが表示されないこと
    │       │   └── 認証済みで「自分の投稿」ボタンをクリックした時、/posts に遷移すること
    │       ├── ニックネーム表示
    │       │   ├── 認証済みでnicknameがある時、ヘッダーに「nickname 様」が表示されること
    │       │   └── nicknameがnullの時、「様」が表示されないこと
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
    │   └── createMarkerIcon
    │       ├── isOwn=trueの時、map-marker--ownクラスが付与されること
    │       ├── isOwn=falseの時、map-marker--ownクラスが付与されないこと
    │       ├── 解決済みの自分のマーカーにもmap-marker--ownクラスが付与されること
    │       └── 自分の目撃投稿マーカーにもmap-marker--ownクラスが付与されること
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
    │       │   ├── ローディング中は会話カード形のスケルトンが表示されること
    │       │   ├── 会話がない時は空メッセージが表示されること
    │       │   ├── 取得エラーの時、エラーメッセージが表示されること
    │       │   └── 取得エラーの時、再試行ボタンのクリックでrefetchが呼ばれること
    │       ├── ニックネーム表示
    │       │   ├── nicknameがある時、ヘッダーに「nickname 様」が表示されること
    │       │   └── nicknameがnullの時、「様」が表示されないこと
    │       ├── 未読バッジ
    │       │   ├── unreadCountが1以上の時、未読バッジが表示されること
    │       │   ├── unreadCountが1以上の時、未読バッジが青色の丸スタイルで表示されること
    │       │   └── unreadCountが0の時、未読バッジが表示されないこと
    │       ├── ナビゲーション
    │       │   ├── BottomNavが表示されること
    │       │   ├── Mapに戻るボタンが表示されないこと
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
    ├── components/ui/drawer.test.tsx
    │   └── Drawer
    │       ├── open=trueの時、子要素が表示されること
    │       ├── open=falseの時、子要素が表示されないこと
    │       ├── snapPointsが反映されること
    │       └── Closeコンポーネントがクリックされた時onOpenChangeが呼ばれること
    ├── components/EmptyState.test.tsx
    │   └── EmptyState
    │       ├── タイトルが表示されること
    │       ├── description を渡すと説明文が表示されること
    │       ├── description を渡さない場合は説明文が表示されないこと
    │       ├── icon を渡すとアイコンが装飾として（aria-hidden で）表示されること
    │       ├── icon を渡さない場合は svg が描画されないこと
    │       ├── action を渡すとアクション要素が表示されること
    │       └── className が追加で適用されること
    ├── components/ErrorState.test.tsx
    │   └── ErrorState
    │       ├── メッセージが role=alert の領域に表示されること
    │       ├── メッセージが destructive スタイルで表示されること
    │       ├── description を渡すと説明文が表示されること
    │       ├── onRetry を渡すと再試行ボタンが表示され、クリックで呼ばれること
    │       ├── onRetry を渡さない場合は再試行ボタンが表示されないこと
    │       └── className が追加で適用されること
    ├── components/BottomNav.test.tsx
    │   └── BottomNav
    │       ├── タブ表示
    │       │   ├── currentPath=/posts の時、「自分の投稿」タブがアクティブ状態で表示されること
    │       │   ├── currentPath=/conversations の時、「会話」タブがアクティブ状態で表示されること
    │       │   └── ログアウトアイコンタブが表示されること
    │       ├── ナビゲーション
    │       │   ├── マップタブをクリックした時、/ に遷移すること
    │       │   ├── 自分の投稿タブをクリックした時、/posts に遷移すること
    │       │   └── 会話タブをクリックした時、/conversations に遷移すること
    │       └── ログアウト
    │           ├── ログアウトアイコンをクリックした時、確認ダイアログが表示されること
    │           ├── 確認ダイアログでログアウトを実行した時、logout API と clearToken が呼ばれること
    │           ├── 確認ダイアログでキャンセルした時、ログアウトが実行されないこと
    │           └── logout API が失敗した時でも clearToken が呼ばれること
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
    │       ├── ローディング・エラー
    │       │   ├── メッセージローディング中はチャットバブル形のスケルトンが表示されること
    │       │   ├── スケルトンは role=status と読み込み中ラベルでスクリーンリーダーに通知されること
    │       │   ├── メッセージ取得エラー時は「メッセージの取得に失敗しました」が統一されたスタイルで表示されること
    │       │   ├── エラー表示が統一されたスタイルであること
    │       │   └── エラー時に再試行ボタンをクリックするとメッセージのrefetchが呼ばれること
    │       ├── 画像送信
    │       │   ├── 入力エリアに画像選択ボタンが表示されること
    │       │   ├── 画像選択後、プレビュー画像が表示されること
    │       │   ├── 画像のみ選択して送信する時、image を含む mutate が呼ばれること
    │       │   ├── 画像選択後、テキストなし・画像のみでも送信ボタンが有効であること
    │       │   └── プレビューのキャンセルボタンをクリックした時、プレビューが消えること
    │       └── 画像メッセージ表示
    │           ├── imageUrl を持つメッセージにサムネイルが表示されること
    │           ├── サムネイルをクリックした時、フルサイズモーダルが表示されること
    │           ├── モーダルの外側をクリックした時、モーダルが閉じること
    │           ├── bodyがあり imageUrl もあるメッセージ、両方表示されること
    │           ├── WebSocket で imageUrl を含むメッセージが届いた時、サムネイルが表示されること
    │           └── imageUrl がない通常メッセージが正常に表示されること
    ├── LoginWithAuth.test.tsx
    │   └── LoginWithAuth
    │       ├── フォームが正しくレンダリングされること
    │       ├── パスワード表示トグルで入力欄のtype属性が切り替わること
    │       ├── 正常ログイン時、マップ画面（/）にリダイレクトすること
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
            ├── データ取得
            │   └── listPostsがmine:trueで呼び出されること
            ├── 編集リンク表示制御
            │   ├── 自分の投稿（userId一致）には編集リンクが表示されること
            │   └── 他人の投稿（userId不一致）には編集リンクが表示されないこと
            ├── ステータスバッジ
            │   ├── status=lostの投稿に「迷子中」バッジが表示されること
            │   └── status=resolvedの投稿に「解決済み」バッジが表示されること
            ├── ヘッダー
            │   └── ニックネームを使って「{nickname}様の投稿」が表示されること
            ├── 読み込み状態
            │   ├── データ取得中は投稿カード形のスケルトンが表示されること
            │   └── スケルトンは role=status と読み込み中ラベルでスクリーンリーダーに通知されること
            ├── カードグリッド
            │   ├── 投稿データがカード形式で表示されること
            │   ├── 画像がない時は「画像がありません」と表示されること
            │   └── ペット名がない時は「名前不明」と表示されること
            ├── Infinite Scroll
            │   ├── センチネルが交差した時、次のページをフェッチすること
            │   ├── 追加フェッチ中はローディングスピナーが表示されること
            │   ├── 全件表示後は「これ以上ありません」と表示されること
            │   └── 投稿が0件の時は新規投稿を促す案内メッセージが表示されること
            ├── エラー表示
            │   ├── 取得エラー時は role=alert の領域に「エラーが発生しました」が表示されること
            │   └── 再試行ボタンをクリックした時、refetchが呼ばれること
            ├── 削除フロー
            │   ├── Deleteボタンをクリックした時、AlertDialogが表示されること
            │   ├── AlertDialogでキャンセルをクリックした時、削除が実行されないこと
            │   ├── AlertDialogで削除を確認した時、投稿が削除され削除完了トーストが表示されること
            │   └── 削除が失敗した時、エラートーストが表示されること
            ├── Map導線
            │   └── 地図アイコンボタンをクリックした時、/?postId=xxx に遷移すること
            └── ナビゲーション
                ├── BottomNavが表示されること
                └── マップに戻るボタンが表示されないこと
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
