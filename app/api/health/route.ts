import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 *
 * Returns 200 with DB connectivity status.
 * Used by load balancers and deployment health checks.
 *
 * Response shape:
 *   { status: "ok" | "degraded", db: "up" | "down", uptime: number }
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  let dbStatus: "up" | "down" = "down";

  try {
    // Cheapest possible query — just checks the connection pool
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch {
    // Log on the server, but don't surface internals to the client
    console.error("[health] DB connectivity check failed");
  }

  const status = dbStatus === "up" ? "ok" : "degraded";
  const httpStatus = dbStatus === "up" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      uptime: process.uptime(),
    },
    { status: httpStatus }
  );
}
