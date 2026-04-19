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
- [x] 画像が5枚超の場合 BadRequestException をスローする
- [x] petDetail と location を含む時、トランザクションで一括作成する
- [x] lostDate を指定して作成できる

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

- [x] オーナーが更新できる
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)
- [x] lostDate を更新できる
- [x] status を更新できる
- [x] petDetail を upsert できる
- [x] location を upsert できる

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

### AuthService (`src/auth/auth.service.spec.ts`)

（既存テスト・詳細省略）

### UserService (`src/users/user.service.spec.ts`)

（既存テスト・詳細省略）
