-- AlterTable: Drop unique constraint on locale (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Language_locale_key') THEN
    ALTER TABLE "Language" DROP CONSTRAINT "Language_locale_key";
  END IF;
END $$;

-- AlterTable: Add projectId column (nullable first)
ALTER TABLE "Language" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- AlterTable: Add updatedAt column
ALTER TABLE "Language" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Data Migration: Copy existing languages to all projects
-- This ensures all projects have access to the same languages that existed before
INSERT INTO "Language" ("id", "locale", "name", "projectId", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  l.locale,
  l.name,
  p.id as "projectId",
  l."isActive",
  l."createdAt",
  CURRENT_TIMESTAMP
FROM "Language" l
CROSS JOIN "Project" p
WHERE l."projectId" IS NULL;

-- Delete original language records (without projectId)
DELETE FROM "Language" WHERE "projectId" IS NULL;

-- AlterTable: Make projectId NOT NULL
ALTER TABLE "Language" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Language_locale_projectId_key" ON "Language"("locale", "projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Language_projectId_idx" ON "Language"("projectId");

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
