# テスト一覧

## apps/api

### PostsService (`src/posts/post.service.spec.ts`)

#### findAll
- [x] ページ1・perPage5 で skip=0 / take=5 を渡す
- [x] ページ3・perPage5 で skip=10 を渡す
- [x] items と total を返す

#### create
- [x] ファイルなしで投稿を作成する
- [x] ファイルありで投稿を作成する時、imagePathが設定されること
- [x] アップロードディレクトリが存在しない時、mkdirSyncを呼ぶこと

#### update
- [x] オーナーが更新できる
- [x] オーナー以外は ForbiddenException
- [x] 存在しない投稿は HttpException (404)
- [x] ファイルありかつ既存画像がある時、古い画像ファイルが削除されること
- [x] ファイルありかつ既存画像がない時、unlinkSyncを呼ばないこと

#### remove
- [x] オーナーが削除できる
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
- [x] req.user.id を authorId として投稿を作成する
- [x] ファイル付きで作成できる

#### update
- [x] オーナーが更新できる
- [x] オーナー以外は ForbiddenException を伝播する
- [x] 存在しない投稿は HttpException を伝播する

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
