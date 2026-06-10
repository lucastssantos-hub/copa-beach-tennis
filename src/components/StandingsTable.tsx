// Classificação de um grupo — só conta confrontos finalizados.
// Desempate: vitórias → partidas vencidas → saldo de games → confronto direto → games pró.
import { computeStandings } from "../lib/engine";
import type { Match, Result } from "../lib/types";

interface StandingsTableProps {
  matches: Match[];
  results: Result[];
  qualifyCount?: number;
  highlight?: string | null; // team_id ou nome
}

export default function StandingsTable({ matches, results, qualifyCount = 2, highlight = null }: StandingsTableProps) {
  const rows = computeStandings(matches, results);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[26px_1fr_30px_30px_34px_44px] gap-1.5 px-3 pb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cream/50">
        <span>#</span>
        <span>Equipe</span>
        <span className="text-center">V</span>
        <span className="text-center">D</span>
        <span className="text-center">SV</span>
        <span className="text-center">Saldo</span>
      </div>
      {rows.map((r, i) => {
        const saldo = r.gp - r.gc;
        const isMe = highlight !== null && (r.key === highlight || r.name === highlight);
        const qualifies = i < qualifyCount;
        return (
          <div
            key={r.key}
            className={`grid grid-cols-[26px_1fr_30px_30px_34px_44px] items-center gap-1.5 rounded-2xl border px-3 py-2.5 ${
              isMe ? "border-coral/40 bg-coral/10" : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <span className={`font-display text-sm ${qualifies ? "text-emerald-300" : "text-cream/40"}`}>{i + 1}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-base leading-none">{r.flag || "🏳️"}</span>
              <span className="truncate text-sm font-bold text-branco-quente">{r.name}</span>
            </div>
            <span className="text-center font-mono text-sm font-semibold text-branco-quente">{r.v}</span>
            <span className="text-center font-mono text-sm text-cream/60">{r.d}</span>
            <span className="text-center font-mono text-sm text-cream/60">{r.sv}</span>
            <span className={`text-center font-mono text-sm ${saldo >= 0 ? "text-emerald-300" : "text-coral"}`}>
              {saldo > 0 ? "+" : ""}
              {saldo}
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-2 px-3 pt-1 text-[11px] font-bold text-cream/50">
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        Classificam para a fase eliminatória
      </div>
    </div>
  );
}
