DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'user';