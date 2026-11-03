#!/usr/bin/env bash
# Vercel'da build: sxemani yangilash, bo'sh bazaga katalogni yuklash, so'ng Next build.
# Neon integratsiyasi DATABASE_URL (pooler) va DATABASE_URL_UNPOOLED (to'g'ridan-to'g'ri)
# beradi; migratsiyalar pooler orqali ishlamaydi, shuning uchun to'g'ridan-to'g'ri ulanish olinadi.
set -euo pipefail

# Neon integratsiyasi prefiksga qarab turli nom beradi — birinchi topilgani olinadi
POOLED="${DATABASE_URL:-${STORAGE_URL:-${POSTGRES_PRISMA_URL:-${POSTGRES_URL:-}}}}"
DIRECT="${DATABASE_URL_UNPOOLED:-${STORAGE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$POOLED}}}"

if [ -z "$POOLED" ]; then
  echo "Baza manzili topilmadi: Vercel → Storage → Neon bazasini loyihaga ulang." >&2
  exit 1
fi
echo "Baza: $(echo "$POOLED" | sed -E 's#^[a-z]+://[^@]*@([^/:?]+).*#\1#')"

export DATABASE_URL="$POOLED"
npx prisma generate
DATABASE_URL="$DIRECT" npx prisma migrate deploy
DATABASE_URL="$DIRECT" npx tsx scripts/snapshot.ts load --if-empty
npx next build
