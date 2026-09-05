-- CreateEnum
CREATE TYPE "DealTaskStatus" AS ENUM ('PENDING', 'COMPLETED');

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

-- CreateIndex
CREATE INDEX "DealTask_dealId_status_idx" ON "DealTask"("dealId", "status");
CREATE INDEX "DealTask_assignedToId_status_idx" ON "DealTask"("assignedToId", "status");
CREATE INDEX "DealTask_dueDate_status_idx" ON "DealTask"("dueDate", "status");

-- AddForeignKey
ALTER TABLE "DealTask" ADD CONSTRAINT "DealTask_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealTask" ADD CONSTRAINT "DealTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
