import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import Header from "../components/Header";
import PublicNav from "../components/PublicNav";
import type { Athlete, Team } from "../lib/types";
import { useTable } from "../lib/useTable";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function Inscritos() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: teams, loading: teamsLoading, error: teamsError } = useTable<Team>("teams", {
    orderBy: "team_name",
    ascending: true,
    pollMs: 120000,
  });
  const { data: athletes, loading: athletesLoading, error: athletesError } = useTable<Athlete>("athletes", {
    orderBy: "athlete_name",
    ascending: true,
    pollMs: 120000,
  });

  const visibleTeams = useMemo(() => {
    const term = normalize(search.trim());
    return teams
      .map((team) => {
        const roster = athletes.filter((athlete) => {
          const belongsToTeam = athlete.team_id === team.id || athlete.team_name === team.team_name;
          const matchesSearch = !term || normalize(athlete.athlete_name).includes(term);
          return belongsToTeam && matchesSearch;
        });
        return { team, roster };
      })
      .filter(({ team, roster }) => (!teamId || team.id === teamId) && roster.length > 0);
  }, [athletes, search, teamId, teams]);

  const visibleCount = visibleTeams.reduce((total, item) => total + item.roster.length, 0);
  const loading = teamsLoading || athletesLoading;
  const error = teamsError || athletesError;

  return (
    <AppShell width="wide" withBottomNav>
      <Header title="Inscritos" backTo="/" />

      <main className="flex-1 pb-10">
        <section aria-label="Filtros dos inscritos" className="space-y-4">
          <div className="flex gap-2 overflow-x-auto px-5 pb-1" aria-label="Filtrar por seleção">
            <button
              type="button"
              onClick={() => setTeamId(null)}
              aria-pressed={teamId === null}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                teamId === null ? "border-cream bg-cream text-roxo-escuro" : "border-white/15 bg-white/5 text-cream/80"
              }`}
            >
              Todas as seleções
            </button>
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setTeamId(teamId === team.id ? null : team.id)}
                aria-pressed={teamId === team.id}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                  teamId === team.id ? "border-cream bg-cream text-roxo-escuro" : "border-white/15 bg-white/5 text-cream/80"
                }`}
              >
                <span aria-hidden="true">{team.flag || "🏳️"}</span> {team.team_name}
              </button>
            ))}
          </div>

          <div className="px-5">
            <label htmlFor="athlete-search" className="sr-only">Buscar atleta</label>
            <input
              id="athlete-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar atleta pelo nome"
              className="h-12 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-branco-quente outline-none placeholder:text-cream/50 focus:border-coral"
            />
          </div>
        </section>

        <div className="mt-7 flex items-end justify-between px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">Lista oficial</p>
            <h2 className="mt-1 font-display text-2xl uppercase text-branco-quente">
              {loading ? "Carregando" : `${visibleCount} atletas`}
            </h2>
          </div>
          {!loading && <p className="text-xs font-bold text-cream/60">{visibleTeams.length} seleções</p>}
        </div>

        <section className="mt-4 space-y-4 px-5" aria-live="polite">
          {error ? (
            <EmptyState icon="⚠️" title="Não foi possível carregar os inscritos" message="Atualize a página e tente novamente." />
          ) : loading ? (
            <div className="space-y-3" aria-label="Carregando inscritos">
              {[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white/[0.06]" />)}
            </div>
          ) : visibleTeams.length === 0 ? (
            <EmptyState icon="🔎" title="Nenhum atleta encontrado" message="Tente outra seleção, categoria ou nome." />
          ) : (
            visibleTeams.map(({ team, roster }) => (
              <article key={team.id} className="overflow-hidden rounded-2xl bg-white/[0.06] shadow-[0_12px_30px_rgba(8,0,28,0.22)]">
                <header className="flex items-center gap-3 bg-white/[0.06] px-4 py-3">
                  <span className="text-2xl" aria-hidden="true">{team.flag || "🏳️"}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-extrabold text-branco-quente">{team.team_name}</h3>
                    <p className="text-xs font-semibold text-cream/65">{roster.length} atletas</p>
                  </div>
                  <span className="font-display text-lg text-coral">{team.abbreviation}</span>
                </header>

                <ul className="divide-y divide-white/10">
                  {roster.map((athlete) => (
                    <li key={athlete.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${athlete.gender === "Feminino" ? "bg-coral/20 text-coral" : "bg-sky-300/15 text-sky-200"}`} aria-hidden="true">
                        {athlete.gender === "Feminino" ? "F" : "M"}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-branco-quente">{athlete.athlete_name}</span>
                      <span className="sr-only">{athlete.gender}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </section>
      </main>
      <PublicNav />
    </AppShell>
  );
}
