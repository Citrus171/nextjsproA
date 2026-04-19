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
- [x] petDetail を upsert できる
- [x] petDetail 未存在かつ必須フィールドなしは BadRequestException
- [x] location を upsert できる
- [x] location 未存在かつ必須フィールドなしは BadRequestException

#### remove

- [x] オーナーが削除できる
- [x] 画像ファイルも削除する
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)

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

---

### AuthService (`src/auth/auth.service.spec.ts`)

（既存テスト・詳細省略）

### UserService (`src/users/user.service.spec.ts`)

（既存テスト・詳細省略）

---

## E2E (`test/app.e2e.ts`)

### POST /api/users/register

- [x] オーナーユーザーを登録できる (201)
- [x] 非オーナーユーザーを登録できる (201)
- [x] 重複メールは 400 を返す
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
