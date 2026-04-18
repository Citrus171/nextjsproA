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
│   │   ├── create
│   │   │   ├── ファイルなしで投稿を作成する
│   │   │   ├── ファイルありで投稿を作成する時、imagePathが設定されること
│   │   │   └── アップロードディレクトリが存在しない時、mkdirSyncを呼ぶこと
│   │   ├── update
│   │   │   ├── オーナーが更新できる
│   │   │   ├── オーナー以外は ForbiddenException
│   │   │   ├── 存在しない投稿は HttpException (404)
│   │   │   ├── ファイルありかつ既存画像がある時、古い画像ファイルが削除されること
│   │   │   └── ファイルありかつ既存画像がない時、unlinkSyncを呼ばないこと
│   │   └── remove
│   │       ├── オーナーが削除できる
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
│       │   ├── req.user.id を authorId として投稿を作成する
│       │   └── ファイル付きで作成できる
│       ├── update
│       │   ├── オーナーが更新できる
│       │   ├── オーナー以外は ForbiddenException を伝播する
│       │   └── 存在しない投稿は HttpException を伝播する
│       ├── imageFileFilter
│       │   ├── fileがnullの時、cb(null, false)を呼ぶこと
│       │   ├── originalnameがない時、cb(null, false)を呼ぶこと
│       │   ├── 許可されたMIMEタイプの時、cb(null, true)を呼ぶこと
│       │   └── 許可されていないMIMEタイプの時、BadRequestExceptionを渡すこと
│       └── remove
│           ├── オーナーが削除できる
│           ├── オーナー以外は ForbiddenException を伝播する
│           └── 存在しない投稿は HttpException を伝播する
└── users/
    └── user.service.spec.ts
        └── UserService（既存）
```
