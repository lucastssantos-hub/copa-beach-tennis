import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import Header from "../components/Header";
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
const WARMUP_KEY = "copa-capitao-warmup";
const WARMUP_MS = 5 * 60 * 1000;

interface Warmup {
  matchId: string;
  deadline: number;
}

function loadSession(): Team | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Team) : null;
  } catch {
    return null;
  }
}

// Aquecimento sobrevive a reload; descarta se já passou mais de 1 min do fim.
function loadWarmup(): Warmup | null {
  try {
    const raw = localStorage.getItem(WARMUP_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as Warmup;
    return typeof w?.deadline === "number" && w.deadline > Date.now() - 60_000 ? w : null;
  } catch {
    return null;
  }
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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
// Cartão compacto da lista (formato Lovable): status + placar grande no topo,
// hora · quadra, equipes lado a lado com "vs" no meio.
// ---------------------------------------------------------------------------
function CaptainMatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="animate-fade-in-up cursor-pointer rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusPill status={match.match_status} />
        <span className="font-display text-2xl tabular-nums leading-none text-cream/60">
          {match.score_team_a}
          <span className="mx-1 text-cream/30">×</span>
          {match.score_team_b}
        </span>
      </div>
      <p className="mt-1 font-mono text-xs font-bold text-cream/50">
        {[match.scheduled_time, match.court, match.category_name && `Cat. ${match.category_name}`]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="text-2xl leading-none">{match.team_a_flag || "🏳️"}</span>
          <div className="min-w-0">
            <p className="font-mono text-base font-extrabold leading-tight text-branco-quente">
              {match.team_a_abbreviation || "—"}
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-cream/50">
              {match.team_a_name || "A definir"}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-cream/40">vs</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <p className="font-mono text-base font-extrabold leading-tight text-branco-quente">
              {match.team_b_abbreviation || "—"}
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-cream/50">
              {match.team_b_name || "A definir"}
            </p>
          </div>
          <span className="text-2xl leading-none">{match.team_b_flag || "🏳️"}</span>
        </div>
      </div>
    </div>
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
  onSent,
}: {
  team: Team;
  match: Match;
  lineups: Lineup[];
  presence: Presence[];
  results: Result[];
  onBack: () => void;
  onChanged: () => void;
  onSent: () => void;
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
    onChanged();
    if (status === "Enviada") {
      // Volta para a lista de confrontos e abre o popup de quadra + aquecimento.
      onSent();
      return;
    }
    setFeedback("Rascunho salvo.");
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
          ✕ Fechar
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
  const [warmup, setWarmup] = useState<Warmup | null>(loadWarmup);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!warmup) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [warmup]);

  function startWarmup(matchId: string) {
    const w: Warmup = { matchId, deadline: Date.now() + WARMUP_MS };
    localStorage.setItem(WARMUP_KEY, JSON.stringify(w));
    setWarmup(w);
    setWarmupOpen(true);
    setSelectedId(null);
  }

  function clearWarmup() {
    localStorage.removeItem(WARMUP_KEY);
    setWarmup(null);
    setWarmupOpen(false);
  }

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
  // O confronto vem da lista viva (polling) — a quadra aparece assim que o ADM liberar.
  const warmupMatch = warmup ? teamMatches.find((m) => m.id === warmup.matchId) ?? null : null;
  const warmupRemaining = warmup ? warmup.deadline - now : 0;
  const warmupEnded = warmup !== null && warmupRemaining <= 0;

  return (
    <div className="space-y-4 px-5 pt-2">
      {/* Popup do confronto sobre a lista — o capitão não perde a posição de rolagem */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/15 bg-roxo-escuro pb-8 pt-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
            <CaptainMatchView
              key={selected.id}
              team={team}
              match={selected}
              lineups={lineups}
              presence={presence}
              results={results}
              onBack={() => setSelectedId(null)}
              onChanged={refresh}
              onSent={() => startWarmup(selected.id)}
            />
          </div>
        </div>
      )}

      {/* Popup pós-envio: quadra do jogo + timer de aquecimento de 5 min */}
      {warmup && warmupOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
          onClick={() => setWarmupOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-3xl border border-white/15 bg-roxo-escuro p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-extrabold text-emerald-300">✓ Escalação enviada com sucesso!</p>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/50">
                Quadra do jogo
              </p>
              {warmupMatch?.court ? (
                <p className="font-display text-3xl text-branco-quente">{warmupMatch.court}</p>
              ) : (
                <p className="mt-1 text-sm font-bold text-amber-300">
                  A definir pela organização — acompanhe aqui.
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/50">
                Aquecimento
              </p>
              <p
                className={`font-display text-6xl tabular-nums ${warmupEnded ? "text-coral" : "text-branco-quente"}`}
              >
                {formatCountdown(warmupRemaining)}
              </p>
              {warmupEnded && (
                <p className="text-sm font-bold text-coral">Aquecimento encerrado — dirija-se à quadra!</p>
              )}
            </div>
            <Button full variant="ghost" onClick={() => (warmupEnded ? clearWarmup() : setWarmupOpen(false))}>
              {warmupEnded ? "OK" : "Minimizar"}
            </Button>
          </div>
        </div>
      )}

      {/* Timer minimizado: continua visível na tela do capitão */}
      {warmup && !warmupOpen && (
        <button
          onClick={() => setWarmupOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider text-coral">
            ⏱ Aquecimento {warmupMatch?.court ? `· ${warmupMatch.court}` : "· quadra a definir"}
          </span>
          <span className="font-display text-xl tabular-nums text-branco-quente">
            {formatCountdown(warmupRemaining)}
          </span>
        </button>
      )}

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
          ativos.map((m) => <CaptainMatchCard key={m.id} match={m} onClick={() => setSelectedId(m.id)} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-cream/70">Histórico</h2>
        {historico.length === 0 ? (
          <EmptyState icon="🏆" title="Sem partidas finalizadas" message="Os resultados aparecerão aqui." />
        ) : (
          historico.map((m) => <CaptainMatchCard key={m.id} match={m} onClick={() => setSelectedId(m.id)} />)
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
