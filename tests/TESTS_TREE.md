# テスト一覧（ツリー形式）

```
apps/api/src/
├── common/
│   └── openapi-examples.spec.ts
│       └── OpenAPI example IDs
│           ├── 用途別の OpenAPI 例示 ID が重複しないこと
│           └── 汎用 ID 例示は投稿 ID 例示と一致すること
├── auth/
│   ├── auth.service.spec.ts
│   │   └── AuthService（既存 + validateUser で role を返すことを検証）
│   └── roles.guard.spec.ts
│       └── RolesGuard
│           ├── @Roles デコレータがない場合は通す
│           ├── ロールが一致する場合は通す
│           ├── ロールが一致しない場合は ForbiddenException をスローする
│           └── ユーザーが未設定の場合は ForbiddenException をスローする
├── posts/
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
│   │   │   ├── ファイルありで投稿を作成する時、writeFileSyncが呼ばれること
│   │   │   ├── アップロードディレクトリが存在しない時、mkdirSyncを呼ぶこと
│   │   │   ├── 画像が sharp でリサイズ・JPEG変換されること
│   │   │   ├── 保存ファイル名が UUID v4 + .jpg 形式になること
│   │   │   ├── 元のファイル名（originalname）が保存パスに含まれないこと
│   │   │   ├── 日本語ファイル名でも UUID v4 + .jpg で保存されること
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
│   │   │   ├── ファイルが存在しない場合 unlinkSync を呼ばない
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
│   ├── conversation.service.spec.ts
│   │   ├── create
│   │   │   ├── 有効なデータで会話を作成できること
│   │   │   ├── 同一postId+sightingIdの会話はConflictException
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
│   │   │   └── 存在しない会話へのメッセージはNotFoundException
│   │   ├── findMessages
│   │   │   ├── 会話参加者がメッセージ一覧を取得できること
│   │   │   ├── 会話参加者以外のメッセージ一覧取得はForbiddenException
│   │   │   └── 存在しない会話のメッセージ一覧はNotFoundException
│   │   └── markAsRead
│   │       ├── 相手が送ったunreadメッセージをすべて既読にすること
│   │       ├── 会話参加者以外はForbiddenException
│   │       └── 存在しない会話はNotFoundException
│   ├── conversations.gateway.spec.ts
│   │   ├── handleConnection
│   │   │   ├── トークンなしで接続した場合は切断される
│   │   │   ├── 無効なトークンで接続した場合は切断される
│   │   │   ├── 有効なトークンで接続した場合はsocket.data.userIdが設定される
│   │   │   └── Authorizationヘッダー（Bearer形式）でも認証できる
│   │   ├── handleJoin
│   │   │   └── 指定した会話ルームにjoinすること
│   │   ├── handleLeave
│   │   │   └── 指定した会話ルームからleaveすること
│   │   └── broadcastMessage
│   │       └── 最小化されたペイロードのみemitする（readAtを含まない）
│   └── conversation.controller.spec.ts
│       ├── createMessage
│       │   ├── メッセージ作成後にbroadcastMessageを呼び出すこと
│       │   └── サービスが例外を投げた場合はbroadcastMessageを呼ばないこと
│       └── markAsRead
│           └── 既読更新結果を返すこと
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
    │       └── nickname がなくても name を後方互換で使う
    ├── dto/
    │   └── register.dto.spec.ts
    │       └── RegisterDto
    │           ├── name が未指定でもバリデーションは通る
    │           ├── nickname が未指定でもバリデーションは通る
    │           └── name と nickname があればバリデーションは通る
    └── user.service.spec.ts
        └── UserService
            ├── nickname の重複時に ConflictException をスローする
            ├── （既存テスト省略）
            └── deleteUser
                ├── 指定IDのユーザーを削除する
                └── 存在しないIDは Prisma エラーを再スローする

apps/api/
└── Dredd 契約テスト
    └── packages/api-client/openapi.json と API 実装の契約を hook 経由で検証する

apps/api/test/
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
    │   ├── オーナー: accessToken を返す (200)
    │   ├── 非オーナー: accessToken を返す (200)
    │   └── 誤パスワードは 400 を返す
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
│       ├── /posts を開いた時、共通ナビの Posts / New Post / Login / Register が表示されること
│       ├── /posts を開いて認証済みの時、Logout が表示され Login が表示されないこと
│       └── ヘッダーに会話一覧リンクが表示されること
    ├── CreatePost.test.tsx
    │   └── CreatePost
    │       └── 必須項目を入力して送信した時、lostDate を正規化して cat投稿として作成し一覧へ遷移すること
    ├── Map.test.tsx
    │   └── Map
    │       ├── 地図ページを開いた時、検索バーと種別フィルターが表示されること
    │       ├── 迷い猫投稿を押すと /create に遷移すること
    │       ├── 迷子マーカーを押した時、詳細シートが開くこと
    │       ├── 目撃マーカーを押した時、目撃情報シートが開くこと
    │       ├── 迷子フィルターを押した時、迷子マーカーだけが表示されること
    │       └── 現在地ボタンを押すと現在地へ移動すること
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
    │       ├── 閉じるボタンを押した時、onClose が呼ばれること
    │       └── メッセージを送るボタン
    │           ├── ログイン済みかつ自分がSighting投稿者かつPost投稿者でない時、ボタンが表示されること
    │           ├── currentUserIdが未指定（未ログイン）の時、ボタンが非表示であること
    │           ├── 自分がPost投稿者の時、ボタンが非表示であること
    │           ├── 自分がSighting投稿者でない時、ボタンが非表示であること
    │           ├── markerType=postの時、ボタンが非表示であること
    │           └── ボタンを押した時、onSendMessageが呼ばれること
    ├── EditPost.test.tsx
    │   └── EditPost
    │       └── 取得した postType を表示し、送信時に postType を含める
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
    │       │   └── unreadCountが0の時、未読バッジが表示されないこと
    │       ├── ナビゲーション
    │       │   └── 会話セルをクリックした時、/conversations/:idへ遷移すること
    │       └── ポーリング設定
    │           └── 5秒間隔でポーリングするようにuseQueryが呼ばれること
    └── ConversationChat.test.tsx
        └── ConversationChat
            ├── ヘッダー表示
            │   └── ページ開時、相手ニックネームと投稿タイトルが表示されること
            ├── メッセージ一覧
            │   ├── メッセージ一覧が表示される時、各bodyが表示されること
            │   ├── 自分のメッセージには自分用クラスが付くこと
            │   └── 相手のメッセージには相手用クラスが付くこと
            ├── Socket.io
            │   ├── ページ開時に joinConversation イベントが送信されること
            │   └── newMessage イベント受信時、メッセージリストに追加されること
            ├── メッセージ送信
            │   ├── 送信ボタンクリック時、mutate が呼ばれること
            │   └── 1000文字超の入力は送信ボタンが無効になること
            ├── 既読処理
            │   └── ページを開いた時に markAsRead が呼ばれること
            └── ローディング・エラー
                ├── メッセージローディング中は「読み込み中...」が表示されること
                └── メッセージ取得エラー時は「メッセージの取得に失敗しました」が表示されること
apps/web/tests/playwright/
└── create-post-map-flow.spec.ts
    └── 画像3枚で迷い猫投稿し、マーカークリックで登録内容が表示されること
```
