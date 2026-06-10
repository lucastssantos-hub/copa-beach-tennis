import type { Court } from "../lib/types";
import StatusPill from "./StatusPill";

export default function CourtCard({ court }: { court: Court }) {
  return (
    <div className="animate-fade-in-up rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-display text-lg uppercase text-branco-quente">
          Quadra {court.court_number}
        </p>
        <StatusPill status={court.court_status} />
      </div>
      {court.current_match_label ? (
        <div className="space-y-1 text-sm">
          <p className="font-extrabold text-branco-quente">{court.current_match_label}</p>
          {court.current_game && (
            <p className="font-semibold text-cream/70">{court.current_game}</p>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-cream/50">Sem confronto no momento</p>
      )}
      {court.next_action && (
        <p className="mt-2 border-t border-white/10 pt-2 text-[11px] font-bold uppercase tracking-wide text-coral">
          → {court.next_action}
        </p>
      )}
    </div>
  );
}
