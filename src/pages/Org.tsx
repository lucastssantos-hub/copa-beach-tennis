import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Header from "../components/Header";
import CategoryChips from "../components/CategoryChips";
import BottomNav from "../components/BottomNav";
import MatchDetail from "../components/MatchDetail";
import MatchReadinessCard from "../components/MatchReadinessCard";
import CourtGridCompact from "../components/CourtGridCompact";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import FormInput, { FormSelect } from "../components/FormInput";
import GroupGenerator from "../components/GroupGenerator";
import StandingsTable from "../components/StandingsTable";
import { useTable } from "../lib/useTable";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { createAuditLog } from "../lib/actions";
import { READINESS_BUCKETS, readinessBucket, type ReadinessBucket } from "../lib/engine";
import {
  CATEGORY_CHIPS,
  type AuditLog,
  type Category,
  type Court,
  type Lineup,
  type Match,
  type Notification,
  type Presence,
  type Result,
  type Team,
} from "../lib/types";

const TABS = [
  { id: "ops", label: "OPS" },
  { id: "conf", label: "CONF" },
  { id: "class", label: "CLASS" },
  { id: "notif", label: "NOTIF" },
  { id: "audit", label: "AUDIT" },
  { id: "cfg", label: "CFG" },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface NewMatchFormProps {
  categories: Category[];
  teams: Team[];
  onCreated: () => void;
  onClose: () => void;
}

function NewMatchForm({ categories, teams, onCreated, onClose }: NewMatchFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [phase, setPhase] = useState("");
  const [round, setRound] = useState("");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [time, setTime] = useState("");
  const [court, setCourt] = useState("");
  const [mode, setMode] = useState("Sequencial");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTeams = teams.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase não configurado.");
      return;
    }
    const teamA = teams.find((t) => t.id === teamAId) ?? null;
    const teamB = teams.find((t) => t.id === teamBId) ?? null;
    const nameA = teamA?.team_name || teamAName.trim();
    const nameB = teamB?.team_name || teamBName.trim();
    if (!nameA || !nameB) {
      setError("Informe as duas equipes.");
      return;
    }
    const category = categories.find((c) => c.id === categoryId) ?? null;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("matches").insert({
      category_id: category?.id ?? null,
      category_name: category?.category_name ?? null,
      group_or_phase: phase.trim() || null,
      round: round.trim() || null,
      team_a_id: teamA?.id ?? null,
      team_a_name: nameA,
      team_a_abbreviation: teamA?.abbreviation ?? null,
      team_a_flag: teamA?.flag ?? null,
      team_b_id: teamB?.id ?? null,
      team_b_name: nameB,
      team_b_abbreviation: teamB?.abbreviation ?? null,
      team_b_flag: teamB?.flag ?? null,
      scheduled_time: time.trim() || null,
      court: court.trim() || null,
      match_mode: mode,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await createAuditLog({
      actor: "ORG",
      action: "CRIAR_CONFRONTO",
      entity: "matches",
      details: `${nameA} x ${nameB}${category ? ` — Cat. ${category.category_name}` : ""}`,
    });
    onCreated();
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in-up space-y-3 rounded-3xl border border-coral/40 bg-white/[0.05] p-4"
    >
      <p className="text-sm font-extrabold uppercase tracking-wide text-coral">Novo confronto</p>

      <FormSelect label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Selecione…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.category_name}
          </option>
        ))}
      </FormSelect>

      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Grupo / Fase" value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Grupo A" />
        <FormInput label="Rodada" value={round} onChange={(e) => setRound(e.target.value)} placeholder="Rodada 1" />
      </div>

      {hasTeams ? (
        <>
          <FormSelect label="Equipe A" value={teamAId} onChange={(e) => setTeamAId(e.target.value)}>
            <option value="">Selecione…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag ? `${t.flag} ` : ""}{t.team_name}
              </option>
            ))}
          </FormSelect>
          <FormSelect label="Equipe B" value={teamBId} onChange={(e) => setTeamBId(e.target.value)}>
            <option value="">Selecione…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag ? `${t.flag} ` : ""}{t.team_name}
              </option>
            ))}
          </FormSelect>
        </>
      ) : (
        <>
          <FormInput label="Equipe A" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} placeholder="Brasil" />
          <FormInput label="Equipe B" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} placeholder="Itália" />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Horário" value={time} onChange={(e) => setTime(e.target.value)} placeholder="09:30" />
        <FormInput label="Quadra" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Quadra 1" />
      </div>

      <FormSelect label="Modo do confronto" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="Sequencial">Sequencial</option>
        <option value="Simultâneo">Simultâneo</option>
      </FormSelect>

      {error && <p className="text-sm font-bold text-coral">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Salvando…" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

export default function Org() {
  const [tab, setTab] = useState("ops");
  const [category, setCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<ReadinessBucket>("pendentes");

  const { data: matches, refresh: refreshMatches } = useTable<Match>("matches", { pollMs: 10000 });
  const { data: courts, refresh: refreshCourts } = useTable<Court>("courts", {
    orderBy: "court_number",
    ascending: true,
    pollMs: 10000,
  });
  const { data: categories } = useTable<Category>("categories", {
    orderBy: "category_name",
    ascending: true,
  });
  const { data: teams } = useTable<Team>("teams", { orderBy: "team_name", ascending: true });
  const { data: notifications } = useTable<Notification>("notifications", { limit: 50, pollMs: 15000 });
  const { data: auditLogs } = useTable<AuditLog>("audit_logs", { limit: 50, pollMs: 15000 });
  const { data: lineups, refresh: refreshLineups } = useTable<Lineup>("lineups", { pollMs: 10000 });
  const { data: presence, refresh: refreshPresence } = useTable<Presence>("presence", { pollMs: 10000 });
  const { data: results, refresh: refreshResults } = useTable<Result>("results", { pollMs: 10000 });

  const filteredMatches = useMemo(
    () => (category ? matches.filter((m) => m.category_name === category) : matches),
    [matches, category],
  );

  // Prontidão (formato Lovable): confrontos agrupados por estágio do fluxo.
  const bucketed = useMemo(() => {
    const groups = Object.fromEntries(READINESS_BUCKETS.map((b) => [b.key, [] as Match[]]));
    for (const m of filteredMatches) groups[readinessBucket(m.match_status)].push(m);
    return groups as Record<ReadinessBucket, Match[]>;
  }, [filteredMatches]);

  function refreshOps() {
    refreshMatches();
    refreshCourts();
    refreshLineups();
    refreshPresence();
    refreshResults();
  }

  // CLASS: grupos da categoria escolhida (ou da primeira com confrontos)
  const classCategory = category ?? CATEGORY_CHIPS.find((c) => matches.some((m) => m.category_name === c)) ?? null;
  const classGroups = useMemo(() => {
    const inCategory = matches.filter((m) => m.category_name === classCategory);
    return [...new Set(inCategory.map((m) => m.group_or_phase).filter(Boolean))].sort() as string[];
  }, [matches, classCategory]);

  const capitaoLink = `${window.location.origin}${import.meta.env.BASE_URL}capitao`;
  const telaoLink = `${window.location.origin}${import.meta.env.BASE_URL}telao`;

  return (
    <AppShell withBottomNav>
      <Header title="Organização" backTo="/" />
      <CategoryChips categories={CATEGORY_CHIPS} selected={category} onSelect={setCategory} />

      <main className="flex-1 px-5 pt-5">
        {!supabaseConfigured && (
          <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-300">
            Supabase não configurado — os dados aparecerão depois de preencher o .env.
          </p>
        )}

        {tab === "ops" && (
          <section className="space-y-4">
            <div>
              <h2 className="mb-3 text-lg font-extrabold text-branco-quente">Quadras ao Vivo</h2>
              {courts.length === 0 ? (
                <EmptyState
                  icon="🎾"
                  title="Nenhuma quadra cadastrada"
                  message="Rode o schema.sql no Supabase para criar as 13 quadras."
                />
              ) : (
                <CourtGridCompact courts={courts} />
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-branco-quente">Prontidão dos Confrontos</h2>
              <Button variant="secondary" onClick={() => setShowForm((v) => !v)} className="!px-4 !py-2 text-xs">
                {showForm ? "Fechar" : "+ Novo"}
              </Button>
            </div>

            {showForm && (
              <NewMatchForm
                categories={categories}
                teams={teams}
                onCreated={refreshMatches}
                onClose={() => setShowForm(false)}
              />
            )}

            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {READINESS_BUCKETS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBucket(b.key)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition ${
                    bucket === b.key
                      ? "border-coral/60 bg-coral/20 text-coral"
                      : "border-white/15 text-cream/50"
                  }`}
                >
                  {b.label} ({bucketed[b.key].length})
                </button>
              ))}
            </div>

            {bucketed[bucket].length === 0 ? (
              <EmptyState
                icon="🆚"
                title="Nenhum confronto nesta lista"
                message={category ? `Sem confrontos da categoria ${category} neste estágio.` : "Os confrontos aparecem aqui conforme avançam no fluxo."}
              />
            ) : (
              bucketed[bucket].map((m) => (
                <div key={m.id} className="space-y-3">
                  <MatchReadinessCard
                    match={m}
                    lineups={lineups}
                    presence={presence}
                    results={results}
                    selected={m.id === selectedId}
                    onOpen={() => setSelectedId(m.id === selectedId ? null : m.id)}
                    onEnsureOpen={() => setSelectedId(m.id)}
                    onChanged={refreshOps}
                  />
                  {m.id === selectedId && (
                    <MatchDetail
                      match={m}
                      courts={courts}
                      lineups={lineups}
                      presence={presence}
                      results={results}
                      onChanged={refreshOps}
                    />
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {tab === "conf" && (
          <section className="space-y-3">
            <GroupGenerator
              categories={categories}
              teams={teams}
              matches={matches}
              onGenerated={refreshMatches}
            />
          </section>
        )}

        {tab === "class" && (
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-branco-quente">
              Classificação{classCategory ? ` — Cat. ${classCategory}` : ""}
            </h2>
            {classGroups.length === 0 ? (
              <EmptyState
                icon="📊"
                title="Sem confrontos nesta categoria"
                message="Selecione uma categoria com confrontos nos chips acima, ou gere as chaves na aba CONF."
              />
            ) : (
              classGroups.map((group) => (
                <div key={group} className="space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">{group}</p>
                  <StandingsTable
                    matches={matches.filter((m) => m.category_name === classCategory && m.group_or_phase === group)}
                    results={results}
                  />
                </div>
              ))
            )}
          </section>
        )}

        {tab === "notif" && (
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-branco-quente">Notificações</h2>
            {notifications.length === 0 ? (
              <EmptyState icon="🔔" title="Nenhuma notificação" message="As ações dos capitães aparecerão aqui." />
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="animate-fade-in-up rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
                >
                  <p className="text-sm font-bold text-branco-quente">{n.message}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-cream/50">
                    {n.notification_type || "geral"} · {formatDateTime(n.created_at)}
                  </p>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "audit" && (
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-branco-quente">Auditoria</h2>
            {auditLogs.length === 0 ? (
              <EmptyState icon="🧾" title="Nenhum registro" message="Os registros de auditoria aparecerão aqui." />
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="animate-fade-in-up rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
                >
                  <p className="font-mono text-xs font-bold text-coral">
                    [{log.actor}] {log.action}
                  </p>
                  {log.details && <p className="mt-1 text-sm font-semibold text-cream/80">{log.details}</p>}
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-cream/50">
                    {log.entity || "—"} · {formatDateTime(log.created_at)}
                  </p>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "cfg" && (
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-branco-quente">Configuração</h2>
            <div className="animate-fade-in-up space-y-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
                  Quantidade de quadras
                </p>
                <p className="font-display text-3xl text-branco-quente">{courts.length}</p>
                <p className="text-xs font-semibold text-cream/50">
                  {courts.filter((c) => c.court_status === "Livre").length} livres ·{" "}
                  {courts.filter((c) => c.court_status === "Escape").length} escape
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
                  Link do capitão
                </p>
                <p className="break-all font-mono text-sm font-bold text-coral">{capitaoLink}</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
                  Link do telão
                </p>
                <p className="break-all font-mono text-sm font-bold text-coral">{telaoLink}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav items={TABS} active={tab} onChange={setTab} />
    </AppShell>
  );
}
