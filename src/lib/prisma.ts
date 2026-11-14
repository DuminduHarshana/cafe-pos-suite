import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // If connecting to Postgres without an explicit connection_limit, limit to 2 to protect serverless pooling
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    if (!url.includes("connection_limit=")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}connection_limit=2&pool_timeout=10`;
    }
  }
  return url;
}

const resolvedUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedUrl ? { db: { url: resolvedUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always store on globalThis so serverless containers reuse connection across invocations
globalForPrisma.prisma = prisma;
