-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'SALES_REP');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "DealTaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DealEventType" AS ENUM ('DEAL_CREATED', 'STAGE_CHANGED', 'OWNER_REASSIGNED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(120) NOT NULL,
    "website" VARCHAR(2048) NOT NULL,
    "ownerId" UUID NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "expectedCloseDate" DATE NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'NEW',
    "closedAt" TIMESTAMPTZ(6),
    "stageBeforeClose" "DealStage",
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealCollaborator" (
    "dealId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealCollaborator_pkey" PRIMARY KEY ("dealId","userId")
);

-- CreateTable
CREATE TABLE "DealEvent" (
    "id" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "type" "DealEventType" NOT NULL,
    "oldStage" "DealStage",
    "newStage" "DealStage",
    "backwardReason" TEXT,
    "previousOwnerId" UUID,
    "newOwnerId" UUID,
    "noteBody" TEXT,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealTask" (
    "id" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMPTZ(6),
    "status" "DealTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DealTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealAlertDismissal" (
    "id" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "dismissedById" UUID NOT NULL,
    "expectedCloseDate" DATE NOT NULL,
    "dismissedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealAlertDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Company_ownerId_archivedAt_idx" ON "Company"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "Company_archivedAt_name_idx" ON "Company"("archivedAt", "name");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Deal_companyId_stage_idx" ON "Deal"("companyId", "stage");

-- CreateIndex
CREATE INDEX "Deal_ownerId_stage_idx" ON "Deal"("ownerId", "stage");

-- CreateIndex
CREATE INDEX "Deal_ownerId_updatedAt_idx" ON "Deal"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Deal_stage_expectedCloseDate_idx" ON "Deal"("stage", "expectedCloseDate");

-- CreateIndex
CREATE INDEX "Deal_expectedCloseDate_idx" ON "Deal"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "Deal_title_idx" ON "Deal"("title");

-- CreateIndex
CREATE INDEX "DealCollaborator_userId_dealId_idx" ON "DealCollaborator"("userId", "dealId");

-- CreateIndex
CREATE INDEX "DealEvent_dealId_occurredAt_idx" ON "DealEvent"("dealId", "occurredAt");

-- CreateIndex
CREATE INDEX "DealEvent_actorId_occurredAt_idx" ON "DealEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "DealEvent_type_occurredAt_idx" ON "DealEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "DealTask_dealId_status_idx" ON "DealTask"("dealId", "status");

-- CreateIndex
CREATE INDEX "DealTask_assignedToId_status_idx" ON "DealTask"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "DealTask_dueDate_status_idx" ON "DealTask"("dueDate", "status");

-- CreateIndex
CREATE INDEX "DealAlertDismissal_dismissedById_expectedCloseDate_idx" ON "DealAlertDismissal"("dismissedById", "expectedCloseDate");

-- CreateIndex
CREATE UNIQUE INDEX "DealAlertDismissal_dealId_dismissedById_expectedCloseDate_key" ON "DealAlertDismissal"("dealId", "dismissedById", "expectedCloseDate");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealCollaborator" ADD CONSTRAINT "DealCollaborator_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealCollaborator" ADD CONSTRAINT "DealCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_previousOwnerId_fkey" FOREIGN KEY ("previousOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_newOwnerId_fkey" FOREIGN KEY ("newOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTask" ADD CONSTRAINT "DealTask_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTask" ADD CONSTRAINT "DealTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealAlertDismissal" ADD CONSTRAINT "DealAlertDismissal_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealAlertDismissal" ADD CONSTRAINT "DealAlertDismissal_dismissedById_fkey" FOREIGN KEY ("dismissedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
