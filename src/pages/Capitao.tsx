import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Header from "../components/Header";
import MatchCard from "../components/MatchCard";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import StatusPill from "../components/StatusPill";
import { useTable } from "../lib/useTable";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { createAuditLog, createNotification } from "../lib/actions";
import type { Match, Team } from "../lib/types";

const SESSION_KEY = "copa-capitao-team";

function loadSession(): Team | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Team) : null;
  } catch {
    return null;
  }
}

interface LoginProps {
  onLogin: (team: Team) => void;
}

function CaptainLogin({ onLogin }: LoginProps) {
  const [teamQuery, setTeamQuery] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase não configurado. Veja o README.");
      return;
    }
    const query = teamQuery.trim();
    const code = accessCode.trim();
    if (!query || !code) {
      setError("Preencha equipe e código de acesso.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("teams")
      .select("*")
      .or(`team_name.ilike.%${query}%,country.ilike.%${query}%`)
      .eq("access_code", code)
      .limit(1);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("Equipe ou código de acesso inválidos.");
      return;
    }
    const team = data[0] as Team;
    localStorage.setItem(SESSION_KEY, JSON.stringify(team));
    onLogin(team);
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in-up space-y-4 px-5 pt-4">
      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
        <FormInput
          label="País / Equipe"
          value={teamQuery}
          onChange={(e) => setTeamQuery(e.target.value)}
          placeholder="Brasil"
          autoComplete="off"
        />
        <FormInput
          label="Código de acesso"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="••••••"
          type="password"
          autoComplete="off"
        />
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <Button type="submit" full disabled={loading}>
          {loading ? "Verificando…" : "Entrar"}
        </Button>
      </div>
      {!supabaseConfigured && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-300">
          Supabase não configurado — o login funcionará depois de preencher o .env.
        </p>
      )}
    </form>
  );
}

interface LineupFormProps {
  team: Team;
  match: Match;
  onDone: () => void;
}

function LineupForm({ team, match, onDone }: LineupFormProps) {
  const [players, setPlayers] = useState({
    female_player_1: "",
    female_player_2: "",
    male_player_1: "",
    male_player_2: "",
    mixed_player_1: "",
    mixed_player_2: "",
  });
  const [sending, setSending] = useState(false);
  const [readySending, setReadySending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setPlayer(field: keyof typeof players, value: string) {
    setPlayers((p) => ({ ...p, [field]: value }));
  }

  async function submitLineup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSending(true);
    setError(null);
    setFeedback(null);
    const { error: err } = await supabase.from("lineups").insert({
      match_id: match.id,
      category_name: match.category_name,
      round: match.round,
      team_id: team.id,
      team_name: team.team_name,
      captain_name: team.captain_name,
      ...players,
      lineup_status: "Enviada",
      submitted_at: new Date().toISOString(),
    });
    if (err) {
      setSending(false);
      setError(err.message);
      return;
    }
    await createNotification({
      notification_type: "escalacao",
      message: `${team.team_name} enviou escalação`,
      team_id: team.id,
      team_name: team.team_name,
      match_id: match.id,
    });
    await createAuditLog({
      actor: `CAPITAO:${team.team_name}`,
      action: "ENVIAR_ESCALACAO",
      entity: "lineups",
      details: `Confronto ${match.team_a_name} x ${match.team_b_name}`,
    });
    setSending(false);
    setFeedback("Escalação enviada com sucesso!");
    onDone();
  }

  async function imReady() {
    if (!supabase) return;
    setReadySending(true);
    setError(null);
    setFeedback(null);
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("presence")
      .select("id")
      .eq("match_id", match.id)
      .eq("team_id", team.id)
      .limit(1);
    let err = null;
    if (existing && existing.length > 0) {
      ({ error: err } = await supabase
        .from("presence")
        .update({ captain_ready: true, ready_at: now, updated_at: now })
        .eq("id", existing[0].id));
    } else {
      ({ error: err } = await supabase.from("presence").insert({
        match_id: match.id,
        team_id: team.id,
        team_name: team.team_name,
        captain_ready: true,
        ready_at: now,
      }));
    }
    if (err) {
      setReadySending(false);
      setError(err.message);
      return;
    }
    await createNotification({
      notification_type: "presenca",
      message: `${team.team_name} informou que está pronta na arena`,
      team_id: team.id,
      team_name: team.team_name,
      match_id: match.id,
    });
    await createAuditLog({
      actor: `CAPITAO:${team.team_name}`,
      action: "EQUIPE_PRONTA",
      entity: "presence",
      details: `Confronto ${match.team_a_name} x ${match.team_b_name}`,
    });
    setReadySending(false);
    setFeedback("Presença registrada. Boa sorte!");
  }

  return (
    <form
      onSubmit={submitLineup}
      className="animate-fade-in-up space-y-3 rounded-3xl border border-coral/40 bg-white/[0.05] p-4"
    >
      <p className="text-sm font-extrabold uppercase tracking-wide text-coral">
        Escalação — {match.team_a_name} x {match.team_b_name}
      </p>

      <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">Dupla feminina</p>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Atleta 1" value={players.female_player_1} onChange={(e) => setPlayer("female_player_1", e.target.value)} />
        <FormInput label="Atleta 2" value={players.female_player_2} onChange={(e) => setPlayer("female_player_2", e.target.value)} />
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">Dupla masculina</p>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Atleta 1" value={players.male_player_1} onChange={(e) => setPlayer("male_player_1", e.target.value)} />
        <FormInput label="Atleta 2" value={players.male_player_2} onChange={(e) => setPlayer("male_player_2", e.target.value)} />
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">Dupla mista</p>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Atleta 1" value={players.mixed_player_1} onChange={(e) => setPlayer("mixed_player_1", e.target.value)} />
        <FormInput label="Atleta 2" value={players.mixed_player_2} onChange={(e) => setPlayer("mixed_player_2", e.target.value)} />
      </div>

      {error && <p className="text-sm font-bold text-coral">{error}</p>}
      {feedback && (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
          {feedback}
        </p>
      )}

      <Button type="submit" full disabled={sending}>
        {sending ? "Enviando…" : "Enviar escalação"}
      </Button>
      <Button type="button" variant="secondary" full disabled={readySending} onClick={imReady}>
        {readySending ? "Registrando…" : "✋ Estou pronto na arena"}
      </Button>
    </form>
  );
}

function CaptainPanel({ team, onLogout }: { team: Team; onLogout: () => void }) {
  const { data: matches, refresh } = useTable<Match>("matches", { pollMs: 15000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const teamMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.team_a_id === team.id ||
          m.team_b_id === team.id ||
          m.team_a_name === team.team_name ||
          m.team_b_name === team.team_name,
      ),
    [matches, team],
  );

  const selected = teamMatches.find((m) => m.id === selectedId) ?? null;
  const categories = [...new Set(teamMatches.map((m) => m.category_name).filter(Boolean))] as string[];

  return (
    <div className="space-y-4 px-5 pt-2">
      <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
        <span className="text-3xl">{team.flag || "🏳️"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-branco-quente">{team.team_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusPill status={team.status} />
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-roxo/60 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cream"
              >
                Cat. {c}
              </span>
            ))}
          </div>
        </div>
        <button onClick={onLogout} className="text-xs font-bold uppercase tracking-wide text-cream/50">
          Sair
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-cream/70">
          Seus confrontos
        </h2>
        {teamMatches.length === 0 ? (
          <EmptyState
            icon="🆚"
            title="Nenhum confronto da sua equipe"
            message="Aguarde a organização cadastrar os confrontos."
          />
        ) : (
          teamMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              selected={m.id === selectedId}
              onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
            />
          ))
        )}
      </section>

      {selected ? (
        <LineupForm key={selected.id} team={team} match={selected} onDone={refresh} />
      ) : (
        teamMatches.length > 0 && (
          <p className="text-center text-xs font-bold uppercase tracking-wide text-cream/50">
            Toque em um confronto para enviar a escalação
          </p>
        )
      )}
    </div>
  );
}

export default function Capitao() {
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    setTeam(loadSession());
  }, []);

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setTeam(null);
  }

  return (
    <AppShell>
      <Header title="Capitão" backTo="/" />
      {team ? <CaptainPanel team={team} onLogout={logout} /> : <CaptainLogin onLogin={setTeam} />}
    </AppShell>
  );
}
