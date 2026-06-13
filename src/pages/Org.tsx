import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import MatchDetail from "../components/MatchDetail";
import MatchReadinessCard from "../components/MatchReadinessCard";
import CourtGridCompact from "../components/CourtGridCompact";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import FormInput, { FormSelect } from "../components/FormInput";
import GroupGenerator from "../components/GroupGenerator";
import KnockoutGenerator from "../components/KnockoutGenerator";
import StandingsTable from "../components/StandingsTable";
import { useTable } from "../lib/useTable";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { createAuditLog } from "../lib/actions";
import { READINESS_BUCKETS, isGroupPhase, readinessBucket, type ReadinessBucket } from "../lib/engine";
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

const ADMIN_SESSION_KEY = "copa-org-auth";
const ADMIN_PIN_SESSION_KEY = "copa-org-pin";
const ADMIN_PIN =
  import.meta.env.VITE_ADMIN_PIN ||
  import.meta.env.NEXT_PUBLIC_ADMIN_PIN ||
  "";
const ADMIN_PIN_SHA256 =
  import.meta.env.VITE_ADMIN_PIN_SHA256 ||
  "9dc5c9dfa3896f79f39f558c72787ea64454aaa5923dab56ed4282a117caec2f";

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

function groupLabel(match: Match) {
  return match.group_or_phase || "Sem grupo";
}

function groupOrder(label: string) {
  if (isGroupPhase(label)) return Number(label.match(/\d+/)?.[0] ?? 0);
  if (/quartas/i.test(label)) return 90;
  if (/semifinal/i.test(label)) return 91;
  if (/3/.test(label)) return 92;
  if (/final/i.test(label)) return 93;
  return 999;
}

function groupMatchesByPhase(matches: Match[]) {
  const map = new Map<string, Match[]>();
  for (const match of matches) {
    const label = groupLabel(match);
    map.set(label, [...(map.get(label) ?? []), match]);
  }
  return [...map.entries()]
    .map(([label, rows]) => ({
      label,
      rows: rows.sort((a, b) =>
        (a.scheduled_time || "").localeCompare(b.scheduled_time || "") ||
        (a.round || "").localeCompare(b.round || "", "pt-BR", { numeric: true }),
      ),
    }))
    .sort((a, b) => groupOrder(a.label) - groupOrder(b.label) || a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
}

function formatCategoryFilter(categories: string[]) {
  if (categories.length === 0) return null;
  if (categories.length === 1) return categories[0];
  return categories.join(", ");
}

function MultiCategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: string[];
  selected: string[];
  onChange: (categories: string[]) => void;
}) {
  function toggle(category: string) {
    onChange(
      selected.includes(category)
        ? selected.filter((item) => item !== category)
        : [...selected, category],
    );
  }

  return (
    <div className="space-y-2 px-5 pb-1">
      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
            selected.length === 0
              ? "border-coral bg-coral text-branco-quente shadow-[0_4px_16px_rgba(255,90,78,0.4)]"
              : "border-white/15 bg-white/5 text-cream/80"
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => {
          const active = selected.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
                active
                  ? "border-coral bg-coral text-branco-quente shadow-[0_4px_16px_rgba(255,90,78,0.4)]"
                  : "border-white/15 bg-white/5 text-cream/80"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {selected.length > 1 && (
        <p className="text-[11px] font-bold uppercase tracking-wider text-cream/50">
          Visualizando {selected.length} categorias: {formatCategoryFilter(selected)}
        </p>
      )}
    </div>
  );
}

interface NewMatchFormProps {
  categories: Category[];
  teams: Team[];
  onCreated: () => void;
  onClose: () => void;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const loginDisabled = !ADMIN_PIN && !ADMIN_PIN_SHA256;

  async function sha256(value: string) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loginDisabled) {
      setError("PIN do ADM não configurado no deploy.");
      return;
    }
    setChecking(true);
    const cleanPin = pin.trim();
    const valid = ADMIN_PIN ? cleanPin === ADMIN_PIN : (await sha256(cleanPin)) === ADMIN_PIN_SHA256;
    setChecking(false);
    if (!valid) {
      setError("PIN inválido.");
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, "ok");
    sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, cleanPin);
    onLogin();
  }

  return (
    <AppShell>
      <Header title="Organização" backTo="/" />
      <main className="px-5 pt-4">
        <form
          onSubmit={submit}
          className="animate-fade-in-up space-y-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5"
        >
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-coral">Acesso ADM</p>
            <p className="mt-1 text-xs font-semibold text-cream/60">
              Digite o PIN da organização para operar confrontos, quadras e resultados.
            </p>
          </div>
          <FormInput
            label="PIN da organização"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            autoComplete="off"
          />
          {error && <p className="text-sm font-bold text-coral">{error}</p>}
          <Button full type="submit" disabled={loginDisabled || checking}>
            {checking ? "Verificando…" : "Entrar"}
          </Button>
          {loginDisabled && (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-300">
              Configure VITE_ADMIN_PIN no ambiente de deploy antes do evento.
            </p>
          )}
        </form>
      </main>
    </AppShell>
  );
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

interface CaptainAccessRow {
  team_id: string;
  team_name: string;
  country: string | null;
  abbreviation: string | null;
  flag: string | null;
  captain_name: string | null;
  captain_phone: string | null;
  team_status: string;
  access_code: string | null;
  access_updated_at: string | null;
}

function CaptainAccessManager() {
  const [pin, setPin] = useState(() => sessionStorage.getItem(ADMIN_PIN_SESSION_KEY) ?? "");
  const [rows, setRows] = useState<CaptainAccessRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = rows.find((row) => row.team_id === selectedId) ?? null;

  async function loadAccess(currentPin = pin) {
    if (!supabase) {
      setError("Supabase não configurado.");
      return;
    }
    const cleanPin = currentPin.trim();
    if (!cleanPin) {
      setError("Digite o PIN do ADM para gerenciar os acessos.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error: err } = await supabase.rpc("admin_list_captain_access", {
      p_admin_pin: cleanPin,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, cleanPin);
    const list = (data ?? []) as CaptainAccessRow[];
    setRows(list);
    const nextSelected = list.find((row) => row.team_id === selectedId)?.team_id ?? list[0]?.team_id ?? "";
    setSelectedId(nextSelected);
    setMessage(`${list.length} seleções carregadas.`);
  }

  useEffect(() => {
    if (pin) loadAccess(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setCaptainName("");
      setCaptainPhone("");
      setAccessCode("");
      return;
    }
    setCaptainName(selected.captain_name ?? "");
    setCaptainPhone(selected.captain_phone ?? "");
    setAccessCode(selected.access_code ?? "");
  }, [selected]);

  function generateCode() {
    setAccessCode(String(Math.floor(100000 + Math.random() * 900000)));
  }

  async function saveAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !selected) return;
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError("Digite o PIN do ADM para salvar.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: err } = await supabase.rpc("admin_upsert_captain_access", {
      p_admin_pin: cleanPin,
      p_team_id: selected.team_id,
      p_access_code: accessCode.trim(),
      p_captain_name: captainName.trim(),
      p_captain_phone: captainPhone.trim(),
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, cleanPin);
    setMessage(`${selected.team_name}: acesso salvo.`);
    await loadAccess(cleanPin);
  }

  return (
    <div className="animate-fade-in-up space-y-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">Acessos dos capitães</p>
        <p className="mt-1 text-xs font-semibold text-cream/50">
          Cadastre ou altere o código que cada capitão usa para entrar no app.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <FormInput
          label="PIN do ADM"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••••"
          autoComplete="off"
        />
        <Button type="button" variant="secondary" disabled={loading} onClick={() => loadAccess()} className="self-end">
          {loading ? "Carregando…" : "Carregar"}
        </Button>
      </div>

      {rows.length > 0 && (
        <form onSubmit={saveAccess} className="space-y-3">
          <FormSelect label="Seleção" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {rows.map((row) => (
              <option key={row.team_id} value={row.team_id}>
                {row.flag ? `${row.flag} ` : ""}{row.team_name}{row.abbreviation ? ` (${row.abbreviation})` : ""}
              </option>
            ))}
          </FormSelect>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome do capitão"
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              placeholder="Nome"
              autoComplete="off"
            />
            <FormInput
              label="Telefone"
              value={captainPhone}
              onChange={(e) => setCaptainPhone(e.target.value)}
              placeholder="(82) 99999-9999"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <FormInput
              label="Código de acesso"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Ex.: 123456"
              autoComplete="off"
            />
            <Button type="button" variant="ghost" onClick={generateCode} className="self-end">
              Gerar
            </Button>
          </div>

          <p className="text-xs font-semibold text-cream/50">
            Deixe o código vazio e salve para remover o acesso desta seleção.
          </p>

          <Button full type="submit" disabled={saving || !selected}>
            {saving ? "Salvando…" : "Salvar acesso"}
          </Button>
        </form>
      )}

      {message && <p className="text-sm font-bold text-emerald-300">{message}</p>}
      {error && <p className="text-sm font-bold text-coral">{error}</p>}
    </div>
  );
}

export default function Org() {
  const [adminAuthed, setAdminAuthed] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === "ok");
  const [tab, setTab] = useState("ops");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<ReadinessBucket>("pendentes");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  const categoryFilterLabel = formatCategoryFilter(selectedCategories);
  const primaryCategory = selectedCategories[0] ?? null;
  const filteredMatches = useMemo(
    () =>
      selectedCategories.length > 0
        ? matches.filter((m) => m.category_name !== null && selectedCategories.includes(m.category_name))
        : matches,
    [matches, selectedCategories],
  );

  // Prontidão (formato Lovable): confrontos agrupados por estágio do fluxo.
  const bucketed = useMemo(() => {
    const groups = Object.fromEntries(READINESS_BUCKETS.map((b) => [b.key, [] as Match[]]));
    for (const m of filteredMatches) groups[readinessBucket(m.match_status)].push(m);
    return groups as Record<ReadinessBucket, Match[]>;
  }, [filteredMatches]);
  const groupedBucket = useMemo(() => groupMatchesByPhase(bucketed[bucket]), [bucketed, bucket]);

  function refreshOps() {
    refreshMatches();
    refreshCourts();
    refreshLineups();
    refreshPresence();
    refreshResults();
  }

  // CLASS: grupos da categoria escolhida (ou da primeira com confrontos)
  const classCategory = primaryCategory ?? CATEGORY_CHIPS.find((c) => matches.some((m) => m.category_name === c)) ?? null;
  const classGroups = useMemo(() => {
    const inCategory = matches.filter((m) => m.category_name === classCategory);
    return [...new Set(inCategory.map((m) => m.group_or_phase).filter((g): g is string => isGroupPhase(g)))]
      .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));
  }, [matches, classCategory]);

  const capitaoLink = `${window.location.origin}${import.meta.env.BASE_URL}capitao`;
  const telaoLink = `${window.location.origin}${import.meta.env.BASE_URL}telao`;

  if (!adminAuthed) {
    return <AdminLogin onLogin={() => setAdminAuthed(true)} />;
  }

  function logoutAdmin() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
    setAdminAuthed(false);
    setSelectedId(null);
  }

  function collapseKey(label: string) {
    return `${selectedCategories.join(",") || "todas"}:${bucket}:${label}`;
  }

  function toggleGroup(label: string, rows: Match[]) {
    const key = collapseKey(label);
    const nextCollapsed = !collapsedGroups[key];
    if (nextCollapsed && selectedId && rows.some((m) => m.id === selectedId)) {
      setSelectedId(null);
    }
    setCollapsedGroups((prev) => ({ ...prev, [key]: nextCollapsed }));
  }

  function setAllGroups(collapsed: boolean) {
    const next = Object.fromEntries(groupedBucket.map((group) => [collapseKey(group.label), collapsed]));
    if (collapsed) setSelectedId(null);
    setCollapsedGroups((prev) => ({ ...prev, ...next }));
  }

  return (
    <AppShell withBottomNav>
      <Header title="Organização" backTo="/" />
      <MultiCategoryFilter categories={CATEGORY_CHIPS} selected={selectedCategories} onChange={setSelectedCategories} />

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

            {bucketed[bucket].length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/50">
                  {groupedBucket.length} grupo{groupedBucket.length === 1 ? "" : "s"} · {bucketed[bucket].length} confronto{bucketed[bucket].length === 1 ? "" : "s"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAllGroups(true)}
                    className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cream/70"
                  >
                    Minimizar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllGroups(false)}
                    className="rounded-full border border-coral/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-coral"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            )}

            {bucketed[bucket].length === 0 ? (
              <EmptyState
                icon="🆚"
                title="Nenhum confronto nesta lista"
                message={categoryFilterLabel ? `Sem confrontos das categorias ${categoryFilterLabel} neste estágio.` : "Os confrontos aparecem aqui conforme avançam no fluxo."}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {groupedBucket.map((group) => {
                  const key = collapseKey(group.label);
                  const collapsed = !!collapsedGroups[key];
                  return (
                    <section key={group.label} className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.label, group.rows)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left"
                      >
                        <span>
                          <span className="block text-sm font-extrabold uppercase tracking-wide text-branco-quente">
                            {group.label}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-cream/50">
                            {group.rows.length} confronto{group.rows.length === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-coral/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-coral">
                          {collapsed ? "Abrir" : "Minimizar"}
                        </span>
                      </button>

                      {!collapsed && (
                        <div className="space-y-3">
                          {group.rows.map((m) => (
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
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                )}
              </div>
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
            <KnockoutGenerator
              categories={categories}
              matches={matches}
              results={results}
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
            <CaptainAccessManager />
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
              <div className="border-t border-white/10 pt-4">
                <Button full variant="ghost" onClick={logoutAdmin}>
                  Sair do ADM
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav items={TABS} active={tab} onChange={setTab} />
    </AppShell>
  );
}
