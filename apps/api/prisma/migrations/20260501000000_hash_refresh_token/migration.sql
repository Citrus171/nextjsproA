-- RefreshTokenを全削除（平文トークンはハッシュに移行不可のため全ユーザー再ログイン必須）
DELETE FROM "RefreshToken";

-- カラム名変更: token -> tokenHash
ALTER TABLE "RefreshToken" RENAME COLUMN "token" TO "tokenHash";
