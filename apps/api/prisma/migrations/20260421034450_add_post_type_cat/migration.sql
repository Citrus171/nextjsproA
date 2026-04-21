/*
  Warnings:

  - Made the column `emailEncrypted` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emailHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('cat');

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "postType" "PostType" NOT NULL DEFAULT 'cat';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailEncrypted" SET NOT NULL,
ALTER COLUMN "emailHash" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "user_emailhash_unique" RENAME TO "User_emailHash_key";
