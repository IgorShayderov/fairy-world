CREATE TYPE "FeedbackCategory" AS ENUM ('EXPERIENCE', 'BUG', 'IDEA');
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'REPLIED', 'CLOSED');
CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "category" "FeedbackCategory" NOT NULL DEFAULT 'EXPERIENCE',
  "rating" INTEGER,
  "message" TEXT NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Feedback_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5)
);
CREATE TABLE "FeedbackReply" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "adminId" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedbackReply_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");
CREATE INDEX "FeedbackReply_feedbackId_createdAt_idx" ON "FeedbackReply"("feedbackId", "createdAt");
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackReply" ADD CONSTRAINT "FeedbackReply_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackReply" ADD CONSTRAINT "FeedbackReply_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
