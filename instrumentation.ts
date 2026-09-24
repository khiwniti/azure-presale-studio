/**
 * Next.js instrumentation hook — runs once when the Node.js server starts,
 * before any requests are handled. Fails fast if required env vars are absent.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * NOTE: Static import of lib/env is intentional here. The instrumentation
 * module is only bundled for the Node.js runtime (Next.js excludes it from
 * the Edge runtime bundle automatically). The import side-effect — throwing
 * on missing/malformed env vars — is the entire purpose of this file.
 */

import "@/lib/env";

export async function register(): Promise<void> {
  // lib/env throws synchronously during module evaluation if any required
  // variable is absent or invalid, so by the time this function runs the
  // environment is already validated. Nothing to do here.
}
