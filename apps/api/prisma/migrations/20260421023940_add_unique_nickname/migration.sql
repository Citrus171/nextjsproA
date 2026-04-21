/*
  Warnings:

  - A unique constraint covering the columns `[nickname]` on the table `User` will be added.
  - Existing duplicate nickname values must be resolved before creating the unique index.
*/

-- Deduplicate exact duplicate nicknames if any exist.
-- This avoids migration failure on databases with accidental duplicate entries.
WITH "ranked_nicknames" AS (
  SELECT
    "id",
    "nickname",
    ROW_NUMBER() OVER (PARTITION BY "nickname" ORDER BY "id") AS "row_num"
  FROM "User"
  WHERE "nickname" IS NOT NULL
)
UPDATE "User" AS u
SET "nickname" = "nickname" || '__dup__' || "id"
FROM "ranked_nicknames" AS rn
WHERE u."id" = rn."id"
  AND rn."row_num" > 1;

-- Create unique index for nickname.
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
