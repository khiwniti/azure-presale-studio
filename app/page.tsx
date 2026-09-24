/**
 * Root page — renders a minimal shell.
 * Full landing page UI is implemented in Phase 4.
 * This file exists so Next.js has a valid root route for the health check
 * and cookie middleware to operate against.
 */

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-azure-500">
        Azure Presale Studio
      </h1>
      <p className="mt-4 text-slate-400">Starting up…</p>
    </main>
  );
}
