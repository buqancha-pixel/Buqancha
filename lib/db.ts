import { PrismaClient } from "@prisma/client";

/**
 * Baza manzili. Vercel'dagi Neon integratsiyasi prefiksga qarab turli nom beradi
 * (DATABASE_URL, STORAGE_URL, POSTGRES_PRISMA_URL...) — birinchi topilgani olinadi.
 */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.DATABASE_URL || env.STORAGE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || undefined;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = databaseUrl();
export const prisma = globalForPrisma.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
