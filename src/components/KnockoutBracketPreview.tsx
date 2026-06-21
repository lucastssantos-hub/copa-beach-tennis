import type { Match } from "../lib/types";

const PHASES = ["Oitavas de final", "Quartas de final", "Semifinal", "Disputa de 3º lugar", "Final"];

function phaseRank(phase: string | null) {
  const index = PHASES.indexOf(phase || "");
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function teamLabel(match: Match, side: "a" | "b") {
  const name = side === "a" ? match.team_a_name : match.team_b_name;
  const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
  const abbreviation = side === "a" ? match.team_a_abbreviation : match.team_b_abbreviation;
  return name ? `${flag || "🏳️"} ${abbreviation || name}` : "A definir";
}

export default function KnockoutBracketPreview({ categoryName, matches }: { categoryName: string | null; matches: Match[] }) {
  const knockout = matches
    .filter((match) => PHASES.includes(match.group_or_phase || ""))
    .sort((a, b) => phaseRank(a.group_or_phase) - phaseRank(b.group_or_phase) || (a.round || "").localeCompare(b.round || "", "pt-BR", { numeric: true }));

  if (!categoryName || knockout.length === 0) return null;

  const columns = PHASES
    .map((phase) => ({ phase, rows: knockout.filter((match) => match.group_or_phase === phase) }))
    .filter(({ rows }) => rows.length > 0);

  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/50">Chave eliminatória</p>
        <h2 className="mt-1 text-lg font-extrabold text-branco-quente">Categoria {categoryName}</h2>
      </div>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-3 px-1">
          {columns.map(({ phase, rows }) => (
            <div key={phase} className="w-52 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">{phase}</p>
              {rows.map((match) => (
                <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-coral">{match.round || phase}</p>
                  <p className="mt-2 rounded-xl border border-white/10 bg-roxo-escuro/60 px-2.5 py-2 text-xs font-extrabold text-branco-quente">{teamLabel(match, "a")}</p>
                  <p className="my-1 text-center text-[10px] font-bold text-cream/35">×</p>
                  <p className="rounded-xl border border-white/10 bg-roxo-escuro/60 px-2.5 py-2 text-xs font-extrabold text-branco-quente">{teamLabel(match, "b")}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
