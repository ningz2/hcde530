/*
  Warnings:

  - Added the required column `createdByUserId` to the `Workspace` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserProvider" AS ENUM ('EMAIL_PASSWORD', 'GOOGLE');

-- CreateEnum
CREATE TYPE "HierarchyMode" AS ENUM ('GROUPS', 'THEMES', 'RQS');

-- AlterEnum
ALTER TYPE "SnapshotEntityType" ADD VALUE 'CODE';

-- AlterTable
ALTER TABLE "AffinityBoard" ADD COLUMN     "groupGranularity" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "hierarchyMode" "HierarchyMode" NOT NULL DEFAULT 'GROUPS',
ADD COLUMN     "themeGranularity" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "ExportJob" ADD COLUMN     "artifactFilename" TEXT,
ADD COLUMN     "artifactMimeType" TEXT,
ADD COLUMN     "artifactPreview" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provider" "UserProvider" NOT NULL DEFAULT 'EMAIL_PASSWORD';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "researchQuestions" JSONB;

-- CreateTable
CREATE TABLE "Code" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quote" TEXT,
    "memo" TEXT,
    "sourceRef" TEXT,
    "piiMasked" BOOLEAN NOT NULL DEFAULT false,
    "state" "QuoteState" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeAssignment" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UndoSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "SnapshotEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "SnapshotAction" NOT NULL,
    "previous" JSONB NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UndoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Code_workspaceId_state_idx" ON "Code"("workspaceId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CodeAssignment_codeId_themeId_key" ON "CodeAssignment"("codeId", "themeId");

-- CreateIndex
CREATE INDEX "UndoSnapshot_workspaceId_userId_createdAt_idx" ON "UndoSnapshot"("workspaceId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Code" ADD CONSTRAINT "Code_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Code" ADD CONSTRAINT "Code_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "IngestionUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Code" ADD CONSTRAINT "Code_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeAssignment" ADD CONSTRAINT "CodeAssignment_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "Code"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeAssignment" ADD CONSTRAINT "CodeAssignment_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UndoSnapshot" ADD CONSTRAINT "UndoSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UndoSnapshot" ADD CONSTRAINT "UndoSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
