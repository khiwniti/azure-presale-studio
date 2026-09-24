import Link from "next/link";

/**
 * Recent Canvases Section.
 * Renders the session-scoped list of previously generated architecture canvases.
 * Spec §1 & §5.
 */

export interface RecentCanvasItem {
  id: string;
  title: string;
  updatedAt: string;
  nodeCount: number;
}

interface RecentCanvasesProps {
  canvases: RecentCanvasItem[];
}

export function RecentCanvases({ canvases }: RecentCanvasesProps) {
  if (canvases.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 w-full max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
          Your Recent Canvases
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          Scoped to your persistent browser session
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {canvases.map((c) => (
          <Link
            key={c.id}
            href={`/canvas/${c.id}`}
            className="group block p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-azure-500/60 transition-all hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-azure-500" />
                {c.nodeCount} {c.nodeCount === 1 ? "Service" : "Services"}
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(c.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <h3 className="text-xs font-semibold text-slate-200 group-hover:text-azure-300 transition-colors line-clamp-1">
              {c.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
