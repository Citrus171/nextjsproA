-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "body" DROP NOT NULL;

-- RenameIndex
ALTER INDEX "RefreshToken_token_key" RENAME TO "RefreshToken_tokenHash_key";
