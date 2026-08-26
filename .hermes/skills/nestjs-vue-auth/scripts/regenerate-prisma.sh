#!/usr/bin/env bash
# regenerate-prisma.sh
# Regenerates Prisma client after schema changes.
# Safe to run anytime you update prisma/schema.prisma.

set -euo pipefail

echo "🔄 Regenerating Prisma client..."
cd "$(dirname "$0")/../back"

# Ensure DATABASE_URL exists (required by Prisma CLI during generation)
if [ ! -f .env ]; then
  echo "DATABASE_URL=\"postgresql://dummy:dummy@localhost:5432/dummy\"" > .env
  echo "⚠️ Created placeholder .env with dummy DATABASE_URL"
fi

# Generate Prisma client
npx prisma generate

echo "✅ Done!"