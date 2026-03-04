#!/bin/sh
echo "=== Running Prisma db push ==="
cd /app/packages/database
npx prisma db push --skip-generate --schema=prisma/schema.prisma || echo "DB push failed, continuing..."

echo "=== Running seed ==="
npx prisma db seed --schema=prisma/schema.prisma || echo "Seed failed, continuing..."

echo "=== Starting API server ==="
cd /app/apps/api
exec node dist/server.js
