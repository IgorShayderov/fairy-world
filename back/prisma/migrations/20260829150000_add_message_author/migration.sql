-- Add authorId to Message model
ALTER TABLE "Message" ADD COLUMN "authorId" INTEGER NOT NULL;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Message_authorId_idx" ON "Message" ("authorId");
