# テスト一覧（ツリー形式）

```
apps/api/src/
├── auth/
│   └── auth.service.spec.ts
│       └── AuthService（既存）
├── posts/
│   ├── post.service.spec.ts
│   │   ├── findAll
│   │   │   ├── ページ1・perPage5 で skip=0 / take=5 を渡す
│   │   │   ├── ページ3・perPage5 で skip=10 を渡す
│   │   │   └── items と total を返す
│   │   ├── findById
│   │   │   └── petDetail と location と images を include して取得する
│   │   ├── create
│   │   │   ├── ファイルなしで投稿を作成する
│   │   │   ├── ファイルありで投稿を作成する時、writeFileSyncが呼ばれること
│   │   │   ├── アップロードディレクトリが存在しない時、mkdirSyncを呼ぶこと
│   │   │   ├── 画像が sharp でリサイズ・JPEG変換されること
│   │   │   ├── 画像処理でSharpエラーが発生した場合 BadRequestException をスローする
│   │   │   ├── 画像が5枚超の場合 BadRequestException をスローする
│   │   │   ├── petDetail と location を含む時、トランザクションで一括作成する
│   │   │   └── lostDate を指定して作成できる
│   │   ├── addImages
│   │   │   ├── 画像を追加できる
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は NotFoundException
│   │   │   └── 5枚超になる場合は BadRequestException
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
│   │   │   ├── petDetail を upsert できる
│   │   │   └── location を upsert できる
│   │   └── remove
│   │       ├── オーナーが削除できる
│   │       ├── 画像ファイルも削除する
│   │       ├── オーナー以外は ForbiddenException
│   │       └── 存在しない投稿は HttpException (404)
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
│       └── remove
│           ├── オーナーが削除できる
│           ├── オーナー以外は ForbiddenException を伝播する
│           └── 存在しない投稿は HttpException を伝播する
├── map/
│   └── map.service.spec.ts
│       └── getMarkers
│           ├── bbox内のPostマーカーが type='post' で返ること
│           ├── bbox内のSightingマーカーが type='sighting' で返ること
│           ├── statusフィルタ指定時にPostクエリのwhereにstatusが含まれること
│           ├── statusフィルタ指定時にSightingクエリのwhereにpost.statusが含まれること
│           ├── bboxクエリ条件がPostのlocation.lat/lngフィルタとして渡ること
│           ├── bboxクエリ条件がSightingのlat/lngフィルタとして渡ること
│           └── フィルタなしで全マーカー（Post+Sighting）が返ること
├── sightings/
│   └── sighting.service.spec.ts
│       ├── create
│       │   ├── 有効なデータでSightingを作成できること
│       │   ├── 投稿者本人が自分のPostにSightingを作成しようとすると ForbiddenException
│       │   └── 存在しないPostにSightingを作成しようとすると NotFoundException
│       ├── findByPost
│       │   └── postIdに紐づくSighting一覧をcreatedAt降順で返すこと
│       └── remove
│           ├── 本人がSightingを削除できること
│           ├── 他者が削除しようとすると ForbiddenException
│           └── 存在しないSightingを削除しようとすると NotFoundException
└── users/
    └── user.service.spec.ts
        └── UserService（既存）

apps/api/test/
└── app.e2e.ts
    ├── POST /api/users/register
    │   ├── オーナーユーザーを登録できる (201)
    │   ├── 非オーナーユーザーを登録できる (201)
    │   ├── 重複メールは 400 を返す
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
```
