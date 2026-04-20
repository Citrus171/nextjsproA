-- Enable pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add emailEncrypted and emailHash columns
ALTER TABLE "User" ADD COLUMN "emailEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "emailHash" TEXT;

-- Backfill: copy existing email into emailEncrypted and set SHA256(email_normalized) into emailHash as a transitional value.
-- NOTE: This uses SHA256 because HMAC requires a secret not available in migration.
UPDATE "User" SET
  "emailEncrypted" = email,
  "emailHash" = encode(digest(lower(trim(email::text))::bytea, 'sha256'), 'hex')
WHERE email IS NOT NULL;

-- Drop old email column
ALTER TABLE "User" DROP COLUMN email;

-- Add unique constraint on emailHash
ALTER TABLE "User" ADD CONSTRAINT user_emailhash_unique UNIQUE ("emailHash");

-- Note: After deployment, application will start writing HMAC-SHA256 into emailHash for new users.