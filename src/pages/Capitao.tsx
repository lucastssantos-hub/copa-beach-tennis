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
import {
  advanceMatchStatus,
  contestResult,
  createAuditLog,
  createNotification,
  saveLineup,
  upsertPresence,
  type LineupPlayers,
} from "../lib/actions";
import {
  isTerminal,
  needsMista,
  resultsFor,
  sideLineup,
  sidePresence,
  sideTeamName,
  teamSide,
  winnerSide,
} from "../lib/engine";
import type { Lineup, Match, Presence, Result, Team } from "../lib/types";

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
    const { data, error: err } = await supabase.rpc("verify_captain_login", {
      p_query: query,
      p_code: code,
    });
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

// ---------------------------------------------------------------------------
// Tela do confronto (fluxo Lovable): placar → escalação (rascunho/enviar,
// trava após envio) → "estou pronto" → parciais → contestação.
// ---------------------------------------------------------------------------

const EMPTY_PLAYERS: LineupPlayers = {
  female_player_1: "",
  female_player_2: "",
  male_player_1: "",
  male_player_2: "",
  mixed_player_1: "",
  mixed_player_2: "",
};

function GameCell({ label, result, match }: { label: string; result: Result | null; match: Match }) {
  const w = winnerSide(match, result);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-cream/40">{label}</p>
      {w ? (
        <>
          <p className="truncate text-xs font-extrabold text-branco-quente">
            {(w === "a" ? match.team_a_abbreviation : match.team_b_abbreviation) || sideTeamName(match, w)}
          </p>
          <p className="font-mono text-sm font-bold text-coral">{result?.score || "—"}</p>
        </>
      ) : (
        <p className="font-display text-lg text-cream/30">—</p>
      )}
    </div>
  );
}

function CaptainMatchView({
  team,
  match,
  lineups,
  presence,
  results,
  onBack,
  onChanged,
}: {
  team: Team;
  match: Match;
  lineups: Lineup[];
  presence: Presence[];
  results: Result[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const side = teamSide(match, team);
  const myLineup = side ? sideLineup(match, lineups, side) : null;
  const myPresence = side ? sidePresence(match, presence, side) : null;
  const locked = myLineup?.lineup_status === "Enviada";
  const games = resultsFor(match, results);
  const mistaNeeded = needsMista(match, results);
  const terminal = isTerminal(match.match_status);
  const contested = match.match_status === "Resultado contestado";
  const walkover = match.match_status === "W.O." || match.match_status === "Desistência";
  const showResultCard =
    terminal || contested || ["Em andamento", "Resultado pendente"].includes(match.match_status);

  const [players, setPlayers] = useState<LineupPlayers>({
    ...EMPTY_PLAYERS,
    ...(myLineup
      ? {
          female_player_1: myLineup.female_player_1 ?? "",
          female_player_2: myLineup.female_player_2 ?? "",
          male_player_1: myLineup.male_player_1 ?? "",
          male_player_2: myLineup.male_player_2 ?? "",
          mixed_player_1: myLineup.mixed_player_1 ?? "",
          mixed_player_2: myLineup.mixed_player_2 ?? "",
        }
      : {}),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contesting, setContesting] = useState(false);
  const [reason, setReason] = useState("");

  function setPlayer(field: keyof LineupPlayers, value: string) {
    setPlayers((p) => ({ ...p, [field]: value }));
  }

  async function save(status: "Rascunho" | "Enviada") {
    setError(null);
    setFeedback(null);
    if (status === "Enviada") {
      const { female_player_1: f1, female_player_2: f2, male_player_1: m1, male_player_2: m2 } = players;
      if (!f1.trim() || !f2.trim() || !m1.trim() || !m2.trim()) {
        setError("Preencha as duplas feminina e masculina.");
        return;
      }
      if (f1.trim() === f2.trim() || m1.trim() === m2.trim()) {
        setError("As atletas de cada dupla devem ser diferentes.");
        return;
      }
    }
    setBusy(status);
    const err = await saveLineup(match, team, players, status);
    setBusy(null);
    if (err) {
      setError(err);
      return;
    }
    setFeedback(status === "Enviada" ? "Escalação enviada com sucesso!" : "Rascunho salvo.");
    onChanged();
  }

  async function imReady() {
    if (!supabase || !side) return;
    setBusy("ready");
    setError(null);
    await upsertPresence(match, side, { captain_ready: true });
    // Os dois capitães prontos → confronto entra em "Aguardando presença" (confirmação do ADM).
    const { data: rows } = await supabase
      .from("presence")
      .select("team_id, team_name, captain_ready")
      .eq("match_id", match.id);
    const ready = ((rows ?? []) as Pick<Presence, "team_id" | "team_name" | "captain_ready">[]).filter(
      (p) => p.captain_ready,
    );
    if (new Set(ready.map((p) => p.team_id || p.team_name)).size >= 2) {
      await advanceMatchStatus(match, "Aguardando presença");
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
    setBusy(null);
    onChanged();
  }

  async function sendContest() {
    if (!reason.trim()) return;
    setBusy("contest");
    await contestResult(match, reason, team.team_name);
    setBusy(null);
    setContesting(false);
    setReason("");
    onChanged();
  }

  const lineupFields: Array<{ title: string; a: keyof LineupPlayers; b: keyof LineupPlayers; dim?: boolean }> = [
    { title: "Dupla feminina", a: "female_player_1", b: "female_player_2" },
    { title: "Dupla masculina", a: "male_player_1", b: "male_player_2" },
    {
      title: mistaNeeded
        ? "Dupla mista (necessária — confronto 1×1)"
        : "Dupla mista — se necessário (apenas se o confronto ficar 1×1)",
      a: "mixed_player_1",
      b: "mixed_player_2",
      dim: !mistaNeeded,
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-4 px-5 pt-2">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs font-bold uppercase tracking-wide text-cream/50">
          ← Voltar aos confrontos
        </button>
        <StatusPill status={match.match_status} />
      </div>

      {/* Placar */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-cream/50">
          {[match.category_name && `Cat. ${match.category_name}`, match.group_or_phase, match.round, match.court]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-center">
            <p className="text-3xl">{match.team_a_flag || "🏳️"}</p>
            <p className="truncate text-sm font-extrabold text-branco-quente">
              {match.team_a_abbreviation || match.team_a_name}
            </p>
          </div>
          <p className="font-display text-4xl tabular-nums text-branco-quente">
            {match.score_team_a}
            <span className="mx-1 text-cream/40">×</span>
            {match.score_team_b}
          </p>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-3xl">{match.team_b_flag || "🏳️"}</p>
            <p className="truncate text-sm font-extrabold text-branco-quente">
              {match.team_b_abbreviation || match.team_b_name}
            </p>
          </div>
        </div>
      </div>

      {/* Pós-envio: confirmação + estou pronto */}
      {locked && !terminal && !contested && (
        <div className="space-y-3 rounded-3xl border border-emerald-400/30 bg-emerald-400/5 p-4">
          <div>
            <p className="text-sm font-extrabold text-emerald-300">✓ Escalação enviada com sucesso</p>
            <p className="text-xs font-semibold text-cream/60">Aguarde confirmação da organização.</p>
          </div>
          {myPresence?.admin_confirmed ? (
            <p className="text-center text-xs font-bold text-emerald-300">
              ✓ Presença confirmada pela organização
            </p>
          ) : myPresence?.captain_ready ? (
            <p className="text-center text-xs font-bold text-amber-300">
              ● Organização avisada — aguardando confirmação presencial
            </p>
          ) : (
            <Button full disabled={busy !== null} onClick={imReady}>
              {busy === "ready" ? "Registrando…" : "✋ Estou pronto na arena"}
            </Button>
          )}
        </div>
      )}

      {/* Escalação */}
      {!terminal && !contested && (
        <div className="space-y-3 rounded-3xl border border-coral/40 bg-white/[0.05] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold uppercase tracking-wide text-coral">Sua escalação</p>
            <StatusPill status={myLineup ? myLineup.lineup_status : "Pendente"} />
          </div>
          {lineupFields.map(({ title, a, b, dim }) => (
            <div key={a} className={dim && !locked ? "opacity-50" : ""}>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-cream/60">{title}</p>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Atleta 1" value={players[a]} onChange={(e) => setPlayer(a, e.target.value)} disabled={locked} />
                <FormInput label="Atleta 2" value={players[b]} onChange={(e) => setPlayer(b, e.target.value)} disabled={locked} />
              </div>
            </div>
          ))}

          {error && <p className="text-sm font-bold text-coral">{error}</p>}
          {feedback && (
            <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
              {feedback}
            </p>
          )}

          {!locked && (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={busy !== null} onClick={() => save("Rascunho")}>
                {busy === "Rascunho" ? "Salvando…" : "💾 Rascunho"}
              </Button>
              <Button className="flex-1" disabled={busy !== null} onClick={() => save("Enviada")}>
                {busy === "Enviada" ? "Enviando…" : "Enviar escalação"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Resultado / parciais */}
      {showResultCard && (
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-sm font-extrabold uppercase tracking-wide text-coral">
            Resultado{walkover ? ` — ${match.match_status}` : ""}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <GameCell label="Fem" result={games.fem} match={match} />
            <GameCell label="Masc" result={games.masc} match={match} />
            <GameCell label="Mista" result={games.mista} match={match} />
          </div>

          {contested ? (
            <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
              ⚠ Contestação enviada — aguardando decisão da organização.
              {match.contest_reason && (
                <span className="block font-semibold text-rose-200">Motivo: {match.contest_reason}</span>
              )}
            </p>
          ) : match.match_status === "Finalizado" ? (
            !contesting ? (
              <Button variant="secondary" full onClick={() => setContesting(true)}>
                ⚠ Contestar resultado
              </Button>
            ) : (
              <div className="space-y-2">
                <FormInput
                  label="Motivo da contestação (obrigatório)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o que aconteceu"
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setContesting(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" disabled={busy !== null || !reason.trim()} onClick={sendContest}>
                    {busy === "contest" ? "Enviando…" : "Enviar contestação"}
                  </Button>
                </div>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

function CaptainPanel({ team, onLogout }: { team: Team; onLogout: () => void }) {
  const { data: matches, refresh: refreshMatches } = useTable<Match>("matches", { pollMs: 15000 });
  const { data: lineups, refresh: refreshLineups } = useTable<Lineup>("lineups", { pollMs: 15000 });
  const { data: presence, refresh: refreshPresence } = useTable<Presence>("presence", { pollMs: 15000 });
  const { data: results, refresh: refreshResults } = useTable<Result>("results", { pollMs: 15000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function refresh() {
    refreshMatches();
    refreshLineups();
    refreshPresence();
    refreshResults();
  }

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

  const ativos = teamMatches.filter((m) => !isTerminal(m.match_status));
  const historico = teamMatches.filter((m) => isTerminal(m.match_status));
  const selected = teamMatches.find((m) => m.id === selectedId) ?? null;
  const categories = [...new Set(teamMatches.map((m) => m.category_name).filter(Boolean))] as string[];

  // Tela dedicada do confronto (fluxo Lovable)
  if (selected) {
    return (
      <CaptainMatchView
        key={selected.id}
        team={team}
        match={selected}
        lineups={lineups}
        presence={presence}
        results={results}
        onBack={() => setSelectedId(null)}
        onChanged={refresh}
      />
    );
  }

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
          Próximos confrontos
        </h2>
        {ativos.length === 0 ? (
          <EmptyState
            icon="🆚"
            title="Nenhum confronto ativo"
            message="Aguarde a organização cadastrar os confrontos."
          />
        ) : (
          ativos.map((m) => <MatchCard key={m.id} match={m} onClick={() => setSelectedId(m.id)} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-cream/70">Histórico</h2>
        {historico.length === 0 ? (
          <EmptyState icon="🏆" title="Sem partidas finalizadas" message="Os resultados aparecerão aqui." />
        ) : (
          historico.map((m) => <MatchCard key={m.id} match={m} onClick={() => setSelectedId(m.id)} />)
        )}
      </section>
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
