import AppShell from "../components/AppShell";
import Header from "../components/Header";
import CourtCard from "../components/CourtCard";
import MatchCard from "../components/MatchCard";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import StandingsTable from "../components/StandingsTable";
import { useTable } from "../lib/useTable";
import { isGroupPhase } from "../lib/engine";
import { CATEGORY_CHIPS } from "../lib/types";
import type { Court, Match, Result } from "../lib/types";

const UPCOMING_STATUSES = [
  "Aguardando escalação",
  "Escalação parcial",
  "Escalações recebidas",
  "Aguardando presença",
  "Pronto para quadra",
  "Liberado para quadra",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 pb-6">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-cream/70">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Telao() {
  const { data: courts } = useTable<Court>("courts", {
    orderBy: "court_number",
    ascending: true,
    pollMs: 10000,
  });
  const { data: matches } = useTable<Match>("matches", { pollMs: 10000 });
  const { data: results } = useTable<Result>("results", { limit: 8, pollMs: 10000 });

  const live = matches.filter((m) => m.match_status === "Em andamento");
  const upcoming = matches
    .filter((m) => UPCOMING_STATUSES.includes(m.match_status))
    .slice(0, 6);
  const standingsCategory = CATEGORY_CHIPS.find((cat) =>
    matches.some((m) => m.category_name === cat && isGroupPhase(m.group_or_phase)),
  ) ?? null;
  const standingsGroups = standingsCategory
    ? [...new Set(matches
      .filter((m) => m.category_name === standingsCategory)
      .map((m) => m.group_or_phase)
      .filter((group): group is string => isGroupPhase(group)))]
      .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))
      .slice(0, 2)
    : [];

  return (
    <AppShell>
      <Header title="Telão ao Vivo" backTo="/" />

      <Section title="Quadras ao Vivo">
        {courts.length === 0 ? (
          <EmptyState icon="🎾" title="Nenhuma quadra cadastrada" message="Rode o schema.sql no Supabase para criar as 13 quadras." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {courts.map((c) => (
              <CourtCard key={c.id} court={c} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Jogos em Andamento">
        {live.length === 0 ? (
          <EmptyState icon="⏱️" title="Nenhum jogo em andamento" message="Os jogos ao vivo aparecerão aqui." />
        ) : (
          <div className="space-y-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Próximos Confrontos">
        {upcoming.length === 0 ? (
          <EmptyState icon="🗓️" title="Nenhum confronto programado" message="A organização ainda não cadastrou confrontos." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Resultados Recentes">
        {results.length === 0 ? (
          <EmptyState icon="🏆" title="Nenhum resultado lançado" message="Os resultados aparecerão aqui em tempo real." />
        ) : (
          <div className="space-y-2.5">
            {results.map((r) => (
              <div
                key={r.id}
                className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-branco-quente">
                    {r.winner_team_name || "—"}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cream/50">
                    {r.game_type || "Jogo"} · {r.score || "s/ placar"}
                  </p>
                </div>
                <StatusPill status={r.result_status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={standingsCategory ? `Classificação — Cat. ${standingsCategory}` : "Classificação"}>
        {standingsCategory && standingsGroups.length > 0 ? (
          <div className="space-y-4">
            {standingsGroups.map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">{group}</p>
                <StandingsTable
                  matches={matches.filter((m) => m.category_name === standingsCategory && m.group_or_phase === group)}
                  results={results}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📊" title="Classificação indisponível" message="A classificação aparecerá quando os confrontos de grupos estiverem cadastrados." />
        )}
      </Section>
    </AppShell>
  );
}
