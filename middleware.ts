/**
 * Anonymous session middleware.
 *
 * On every request:
 * 1. Read the `sid` cookie.
 * 2. If absent or invalid UUID: generate a new UUID, set the cookie.
 * 3. Upsert a Session row in Postgres (creates on first visit, updates
 *    lastSeenAt on subsequent visits).
 * 4. Attach the session ID to the request via a response header
 *    `X-Session-Id` so API routes can read it without re-parsing the cookie.
 *
 * This file runs in the Next.js Edge Middleware runtime — it MUST NOT import
 * Prisma or Node.js built-ins. Session persistence (upsert) happens in the
 * API routes and Server Actions that can access the full Node.js runtime.
 *
 * The middleware only handles the cookie lifecycle.
 */

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/** Cookie name for the anonymous session ID. */
export const SESSION_COOKIE = "sid" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function middleware(request: NextRequest): NextResponse {
  const existingId = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId =
    existingId && isValidUuid(existingId) ? existingId : uuidv4();

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-session-id": sessionId,
      }),
    },
  });

  // Only set cookie when issuing a new session — avoids redundant Set-Cookie
  // on every request, which would reset the Expires on each load.
  if (!existingId || !isValidUuid(existingId)) {
    const isProduction = process.env["NODE_ENV"] === "production";
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      // 1 year in seconds — durable across browser restarts per spec §2
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      domain: process.env["COOKIE_DOMAIN"] || undefined,
    });
  }

  return response;
}

// Apply to all routes except Next.js internals and static assets.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
