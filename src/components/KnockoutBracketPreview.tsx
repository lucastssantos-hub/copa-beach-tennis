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

function phaseLabel(phase: string) {
  if (phase === "Oitavas de final") return "Oitavas";
  if (phase === "Quartas de final") return "QF";
  if (phase === "Semifinal") return "SF";
  if (phase === "Disputa de 3º lugar") return "3º lugar";
  return phase;
}

function MatchNode({ match, withConnector }: { match: Match; withConnector: boolean }) {
  return (
    <div className="relative min-w-[190px]">
      <div className="rounded-xl border border-white/15 bg-roxo-escuro/70 shadow-lg shadow-black/10">
        <p className="border-b border-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-coral">
          {match.round || match.group_or_phase}
        </p>
        <p className="border-b border-white/10 px-3 py-2 text-xs font-extrabold text-branco-quente">{teamLabel(match, "a")}</p>
        <p className="px-3 py-2 text-xs font-extrabold text-branco-quente">{teamLabel(match, "b")}</p>
      </div>
      {withConnector && (
        <span aria-hidden="true" className="absolute left-full top-1/2 h-px w-6 bg-cream/35" />
      )}
    </div>
  );
}

export default function KnockoutBracketPreview({ categoryName, matches = [] }: { categoryName: string | null; matches?: Match[] }) {
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
      <div className="-mx-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/10 p-4 pb-5">
        <div className="flex min-w-max items-stretch gap-10 px-1">
          {columns.map(({ phase, rows }) => (
            <div key={phase} className="flex w-[190px] shrink-0 flex-col">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-cream/50">{phaseLabel(phase)}</p>
              <div className="flex flex-1 flex-col justify-around gap-5">
                {rows.map((match) => (
                  <MatchNode key={match.id} match={match} withConnector={phase !== "Final" && phase !== "Disputa de 3º lugar"} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex w-[150px] shrink-0 flex-col justify-center">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-cream/50">Campeão</p>
            <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-center text-sm font-extrabold text-amber-100">
              A definir
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
