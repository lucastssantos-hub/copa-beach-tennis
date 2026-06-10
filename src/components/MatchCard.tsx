import type { Match } from "../lib/types";
import StatusPill from "./StatusPill";

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  selected?: boolean;
}

function TeamRow({
  flag,
  name,
  abbreviation,
  score,
}: {
  flag: string | null;
  name: string | null;
  abbreviation: string | null;
  score: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl leading-none">{flag || "🏳️"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold text-branco-quente">
          {name || "A definir"}
        </p>
        {abbreviation && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream/50">
            {abbreviation}
          </p>
        )}
      </div>
      <span className="font-mono text-2xl font-bold text-branco-quente">{score}</span>
    </div>
  );
}

export default function MatchCard({ match, onClick, selected = false }: MatchCardProps) {
  return (
    <div
      onClick={onClick}
      className={`animate-fade-in-up rounded-3xl border bg-white/[0.05] p-4 backdrop-blur transition ${
        selected ? "border-coral/70 bg-coral/10" : "border-white/10"
      } ${onClick ? "cursor-pointer active:scale-[0.99]" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusPill status={match.match_status} />
        <span className="ml-auto font-mono text-xs font-bold text-cream/70">
          {match.scheduled_time || "—"}
        </span>
        {match.court && (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cream/80">
            {match.court}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <TeamRow
          flag={match.team_a_flag}
          name={match.team_a_name}
          abbreviation={match.team_a_abbreviation}
          score={match.score_team_a}
        />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cream/40">
            vs
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <TeamRow
          flag={match.team_b_flag}
          name={match.team_b_name}
          abbreviation={match.team_b_abbreviation}
          score={match.score_team_b}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-[10px] font-bold uppercase tracking-wider text-cream/50">
        {match.category_name && (
          <span className="rounded-full bg-roxo/60 px-2.5 py-1 text-cream">
            Cat. {match.category_name}
          </span>
        )}
        {(match.group_or_phase || match.round) && (
          <span>{[match.group_or_phase, match.round].filter(Boolean).join(" · ")}</span>
        )}
        <span className="ml-auto">{match.match_mode}</span>
      </div>
    </div>
  );
}
