import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Header from "../components/Header";
import CategoryChips from "../components/CategoryChips";
import BottomNav from "../components/BottomNav";
import MatchCard from "../components/MatchCard";
import CourtCard from "../components/CourtCard";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import FormInput, { FormSelect } from "../components/FormInput";
import { useTable } from "../lib/useTable";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { createAuditLog } from "../lib/actions";
import {
  CATEGORY_CHIPS,
  type AuditLog,
  type Category,
  type Court,
  type Match,
  type Notification,
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

  const { data: matches, refresh: refreshMatches } = useTable<Match>("matches", { pollMs: 10000 });
  const { data: courts } = useTable<Court>("courts", {
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

  const filteredMatches = useMemo(
    () => (category ? matches.filter((m) => m.category_name === category) : matches),
    [matches, category],
  );

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
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-branco-quente">Todos os Confrontos</h2>
              <Button variant="secondary" onClick={() => setShowForm((v) => !v)} className="!px-4 !py-2 text-xs">
                {showForm ? "Fechar" : "+ Novo confronto"}
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

            {filteredMatches.length === 0 ? (
              <EmptyState
                icon="🆚"
                title="Nenhum confronto cadastrado"
                message={category ? `Sem confrontos na categoria ${category}.` : "Use o botão Novo confronto para criar o primeiro."}
              />
            ) : (
              filteredMatches.map((m) => <MatchCard key={m.id} match={m} />)
            )}
          </section>
        )}

        {tab === "conf" && (
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-branco-quente">Quadras ao Vivo</h2>
            {courts.length === 0 ? (
              <EmptyState
                icon="🎾"
                title="Nenhuma quadra cadastrada"
                message="Rode o schema.sql no Supabase para criar as 13 quadras."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {courts.map((c) => (
                  <CourtCard key={c.id} court={c} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "class" && (
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-branco-quente">Classificação</h2>
            <EmptyState
              icon="📊"
              title="Classificação"
              message="Classificação será ativada após lançamento dos resultados."
            />
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
