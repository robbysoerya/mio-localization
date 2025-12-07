-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- Insert default project for existing features
INSERT INTO "Project" ("id", "name", "description", "updatedAt")
VALUES ('clq_default_project_000', 'Default Project', 'Auto-created for existing features during migration', CURRENT_TIMESTAMP);

-- AlterTable: Add projectId column (nullable first)
ALTER TABLE "Feature" ADD COLUMN "projectId" TEXT;

-- Update all existing features to use default project
UPDATE "Feature" SET "projectId" = 'clq_default_project_000' WHERE "projectId" IS NULL;

-- AlterTable: Make projectId NOT NULL
ALTER TABLE "Feature" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Feature_projectId_idx" ON "Feature"("projectId");

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
