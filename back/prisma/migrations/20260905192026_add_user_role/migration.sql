-- Create UserRole enum type
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- Add role column to User table
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';