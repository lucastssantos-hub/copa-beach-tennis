// ============================================================================
// CourtGridCompact — visão de quadras do painel OPS (formato Lovable).
// Quadras livres são tiles pequenos; ocupadas ganham destaque com o confronto.
// ============================================================================
import type { Court } from "../lib/types";

export default function CourtGridCompact({ courts }: { courts: Court[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2 lg:grid-cols-[repeat(auto-fill,minmax(96px,1fr))]">
      {courts.map((c) => {
        const occupied = !!c.current_match_id;
        if (!occupied) {
          return (
            <div
              key={c.id}
              className={`flex min-h-14 flex-col items-center justify-center rounded-lg border px-2 py-2 ${
                c.court_status === "Escape"
                  ? "border-violet-400/30 bg-violet-400/10"
                  : "border-emerald-400/20 bg-emerald-400/5"
              }`}
            >
              <span className="font-mono text-sm font-extrabold text-branco-quente">
                Q{c.court_number}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider ${
                  c.court_status === "Escape" ? "text-violet-300" : "text-emerald-300"
                }`}
              >
                {c.court_status}
              </span>
            </div>
          );
        }
        return (
          <div
            key={c.id}
            className="col-span-2 flex min-h-16 flex-col justify-between rounded-lg border border-coral/40 bg-coral/10 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-sm font-extrabold text-branco-quente">
                Q{c.court_number}
              </span>
              <span className="inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-wider text-coral">
                <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-current" />
                {c.next_action || "Ocupada"}
              </span>
            </div>
            <p className="truncate text-xs font-extrabold text-branco-quente">
              {c.current_match_label || "—"}
            </p>
            {c.current_game && (
              <p className="truncate text-[9px] font-bold uppercase tracking-wide text-cream/60">
                {c.current_game}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
