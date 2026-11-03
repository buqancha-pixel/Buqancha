#!/usr/bin/env bash
# Vercel'da build: sxemani yangilash, bo'sh bazaga katalogni yuklash, so'ng Next build.
# Neon integratsiyasi DATABASE_URL (pooler) va DATABASE_URL_UNPOOLED (to'g'ridan-to'g'ri)
# beradi; migratsiyalar pooler orqali ishlamaydi, shuning uchun to'g'ridan-to'g'ri ulanish olinadi.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL o'rnatilmagan: Vercel → Storage → Neon bazasini loyihaga ulang." >&2
  exit 1
fi

DIRECT="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

npx prisma generate
DATABASE_URL="$DIRECT" npx prisma migrate deploy
DATABASE_URL="$DIRECT" npx tsx scripts/snapshot.ts load --if-empty
npx next build
