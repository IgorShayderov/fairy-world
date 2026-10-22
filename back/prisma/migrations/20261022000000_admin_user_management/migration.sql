CREATE TABLE "AdminUserAudit" (
  "id" TEXT NOT NULL,
  "adminId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminUserAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminUserAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminUserAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdminUserAudit_userId_createdAt_idx" ON "AdminUserAudit"("userId", "createdAt");
