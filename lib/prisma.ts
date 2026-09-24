/**
 * Prisma client singleton.
 *
 * In Next.js dev mode the module is re-evaluated on every hot reload, which
 * would create a new PrismaClient on each reload and exhaust the connection
 * pool. We attach the instance to `globalThis` in non-production environments
 * so reloads reuse the existing pool.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
