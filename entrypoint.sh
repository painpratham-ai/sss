#!/bin/sh
set -e

echo "=== ICSE/CBSE Project Forge — Startup ==="

# 1. Push Prisma schema (creates tables if they don't exist)
echo "[1/3] Pushing database schema..."
bun run db:push

# 2. Check if KB is empty and auto-seed if needed
echo "[2/3] Checking knowledge base..."
KB_COUNT=$(sqlite3 /app/data/custom.db "SELECT COUNT(*) FROM KnowledgeChunk;" 2>/dev/null || echo "0")

if [ "$KB_COUNT" -lt "100" ]; then
  echo "  → KB has only $KB_COUNT chunks. Running auto-seed (this takes ~5 min on first deploy)..."
  npx tsx scripts/seed-for-deployment.ts || echo "  ⚠ Seed script had issues, continuing anyway..."
  echo "  → Seed complete!"
else
  echo "  → KB already has $KB_COUNT chunks. Skipping seed."
fi

# 3. Start the Next.js server
echo "[3/3] Starting Next.js server..."
exec bun run start
