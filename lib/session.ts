/**
 * Session helpers for API routes and Server Actions.
 *
 * The middleware attaches the session ID to X-Session-Id on every request.
 * API routes call `getSessionId(headers())` to read it, then call
 * `touchSession(sessionId)` to upsert the Postgres row.
 *
 * Middleware runs in Edge runtime and cannot touch Prisma — that's why
 * the upsert lives here, in the Node.js runtime.
 */

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/middleware";

/**
 * Read the verified session ID from the X-Session-Id header injected by
 * middleware. Falls back to the raw cookie for direct API calls (e.g. tests).
 *
 * Throws if no valid session ID is found — callers must handle this as 401.
 */
export async function getSessionId(): Promise<string> {
  const hdrs = await headers();
  const fromHeader = hdrs.get("x-session-id");
  if (fromHeader) return fromHeader;

  // Fallback: read cookie directly (useful in Server Actions)
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  throw new Error("No session ID found — middleware may not be running.");
}

/**
 * Upsert the Session row in Postgres.
 * Creates a new row on first visit; updates lastSeenAt on subsequent calls.
 * Returns the full Session record.
 */
export async function touchSession(sessionId: string) {
  return prisma.session.upsert({
    where: { id: sessionId },
    create: { id: sessionId },
    update: { lastSeenAt: new Date() },
  });
}

/**
 * Assert that a canvas belongs to the current session.
 * Throws a typed error if the canvas is not found or belongs to another
 * session — callers map this to 404 (never 403, to avoid leaking existence).
 */
export async function assertCanvasOwnership(
  canvasId: string,
  sessionId: string
) {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId, sessionId },
    select: { id: true },
  });
  if (!canvas) {
    throw new NotFoundError(`Canvas ${canvasId} not found`);
  }
  return canvas;
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
