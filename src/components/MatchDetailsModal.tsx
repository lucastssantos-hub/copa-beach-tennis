// MatchDetailsModal — modal operacional completo do confronto para o painel OPS.
// Substitui a expansão inline do MatchDetail: abre centralizado com fundo escurecido.
// Ver detalhes → modal real, sem push de layout, sem rolar até o final do card.
import { useMemo, useState } from "react";
import Button from "./Button";
import FormInput from "./FormInput";
import StatusPill from "./StatusPill";
import {
  advanceMatchStatus,
  recordGameResult,
  recordWalkover,
  upsertPresence,
} from "../lib/actions";
import {
  normalizeOneSetScore,
  oneSetScoreErrorText,
  oneSetScoreExamples,
  oneSetScoreHelpText,
  oneSetScoreInputPlaceholder,
  parseScoreSets,
  resultsFor,
  sideLineup,
  sidePresence,
  sideTeamName,
  winnerSide,
} from "../lib/engine";
import type { Court, Lineup, Match, Presence, Result } from "../lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  courts: Court[];
  lineups: Lineup[];
  presence: Presence[];
  results: Result[];
  onChanged: () => void;
}

// ---- Bloco de escalação (leitura) ----
function LineupCard({ match, side, lineups }: { match: Match; side: "a" | "b"; lineups: Lineup[] }) {
  const lineup = sideLineup(match, lineups, side);
  const teamName = sideTeamName(match, side);
  const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
  const sent = lineup?.lineup_status === "Enviada";
  const hasAny = !!(lineup?.female_player_1 || lineup?.male_player_1);

  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-branco-quente truncate">{flag} {teamName}</p>
        <span className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          sent
            ? "bg-emerald-500/20 text-emerald-300"
            : hasAny
              ? "bg-amber-500/20 text-amber-300"
              : "bg-white/10 text-cream/40"
        }`}>
          {sent ? "Completa" : hasAny ? "Parcial" : "Pendente"}
        </span>
      </div>
      {hasAny ? (
        <div className="space-y-2 text-xs">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400/80 mb-0.5">Feminino</p>
            <p className="text-cream/80">• {lineup?.female_player_1 || "—"}</p>
            <p className="text-cream/80">• {lineup?.female_player_2 || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400/80 mb-0.5">Masculino</p>
            <p className="text-cream/80">• {lineup?.male_player_1 || "—"}</p>
            <p className="text-cream/80">• {lineup?.male_player_2 || "—"}</p>
          </div>
          {(lineup?.mixed_player_1 || lineup?.mixed_player_2) && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400/80 mb-0.5">Mista</p>
              <p className="text-cream/80">• {lineup?.mixed_player_1 || "—"}</p>
              <p className="text-cream/80">• {lineup?.mixed_player_2 || "—"}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-cream/40 italic">Escalação não enviada.</p>
      )}
    </div>
  );
}

// ---- Presença ----
function PresenceRow({
  match,
  presence,
  side,
  onChanged,
}: {
  match: Match;
  presence: Presence[];
  side: "a" | "b";
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const p = sidePresence(match, presence, side);
  const confirmed = !!p?.admin_confirmed;
  const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
  const name = sideTeamName(match, side);

  async function confirm() {
    setBusy(true);
    await upsertPresence(match, side, { admin_confirmed: true });
    const other = sidePresence(match, presence, side === "a" ? "b" : "a");
    if (other?.admin_confirmed) {
      await advanceMatchStatus(match, "Pronto para quadra");
    } else {
      await advanceMatchStatus(match, "Aguardando presença");
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <span className="text-xl">{flag}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-branco-quente">{name}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cream/50">
          {confirmed
            ? "✓ Presente"
            : p?.captain_ready
              ? "Capitão avisou: pronto na arena"
              : "Sem sinal do capitão"}
        </p>
      </div>
      {confirmed ? (
        <span className="text-lg text-emerald-300">✓</span>
      ) : (
        <Button variant="secondary" className="!px-3 !py-2 !text-[10px]" disabled={busy} onClick={confirm}>
          {busy ? "…" : "Confirmar"}
        </Button>
      )}
    </div>
  );
}

// ---- Formulário de resultado ----
interface GameState {
  winner: "a" | "b" | null;
  score: string;
  error: string | null;
}

function emptyGame(): GameState {
  return { winner: null, score: "", error: null };
}

function initGame(match: Match, r: Result | null): GameState {
  if (!r) return emptyGame();
  const w = winnerSide(match, r);
  return { winner: w, score: r.score || "", error: null };
}

function validateScore(s: string): string | null {
  if (!s.trim()) return "Informe o placar.";
  const sets = parseScoreSets(s.trim());
  if (!sets) return oneSetScoreErrorText();
  for (const set of sets) {
    if (set.gw === set.gl) return "Um set não pode terminar empatado.";
    if (set.gw > 9 || set.gl > 9) return "Games fora do intervalo esperado (0–9).";
  }
  if (!normalizeOneSetScore(s.trim())) return oneSetScoreErrorText();
  return null;
}

// ---- Conteúdo interno (key=match.id reseta todo estado ao trocar confronto) ----
function ModalContent({
  match,
  courts: _courts,
  lineups,
  presence,
  results,
  onChanged,
  onClose,
}: Omit<Props, "isOpen">) {
  const status = match.match_status;
  const games = useMemo(() => resultsFor(match, results), [match, results]);

  const [fem, setFem] = useState<GameState>(() => initGame(match, games.fem));
  const [masc, setMasc] = useState<GameState>(() => initGame(match, games.masc));
  const [mista, setMista] = useState<GameState>(() => initGame(match, games.mista));
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [woKind, setWoKind] = useState<"W.O." | "Desistência" | null>(null);
  const [woBusy, setWoBusy] = useState(false);
  const [forceBusy, setForceBusy] = useState(false);

  // Placar calculado em tempo real a partir dos seletores
  const femWinsA = fem.winner === "a" ? 1 : 0;
  const femWinsB = fem.winner === "b" ? 1 : 0;
  const mascWinsA = masc.winner === "a" ? 1 : 0;
  const mascWinsB = masc.winner === "b" ? 1 : 0;
  const scoreA = femWinsA + mascWinsA;
  const scoreB = femWinsB + mascWinsB;
  const mistaRequired = fem.winner !== null && masc.winner !== null && scoreA === 1 && scoreB === 1;
  const dispA = scoreA + (mista.winner === "a" ? 1 : 0);
  const dispB = scoreB + (mista.winner === "b" ? 1 : 0);

  const finished = ["Finalizado", "W.O.", "Desistência", "Resultado contestado"].includes(status);
  const showPresence = [
    "Escalação parcial",
    "Escalações recebidas",
    "Aguardando presença",
    "Aguardando escalação",
  ].includes(status);
  const canForce = ![
    "Pronto para quadra",
    "Liberado para quadra",
    "Em andamento",
    "Finalizado",
    "W.O.",
    "Desistência",
  ].includes(status);

  const hasScore = match.score_team_a !== null && match.score_team_b !== null;

  async function handleSaveResult() {
    setGlobalError(null);
    let hasError = false;

    const femErr = !fem.winner ? "Selecione o vencedor do feminino." : validateScore(fem.score);
    const mascErr = !masc.winner ? "Selecione o vencedor do masculino." : validateScore(masc.score);
    const mistaErr =
      mistaRequired && !mista.winner
        ? "Como o confronto ficou 1×1, informe a mista."
        : mistaRequired
          ? validateScore(mista.score)
          : null;

    if (femErr) { setFem((p) => ({ ...p, error: femErr })); hasError = true; }
    if (mascErr) { setMasc((p) => ({ ...p, error: mascErr })); hasError = true; }
    if (mistaErr) { setMista((p) => ({ ...p, error: mistaErr })); hasError = true; }
    if (hasError) return;

    console.log("RESULT_SAVE_ATTEMPT", {
      matchId: match.id,
      matchKey: `${match.team_a_name}x${match.team_b_name}`,
      scoreA,
      scoreB,
    });
    setBusy(true);
    try {
      const n1 = normalizeOneSetScore(fem.score.trim())!;
      const r1 = await recordGameResult(match, results, "Feminino", fem.winner!, n1, "ORG");
      if (r1 && "error" in r1 && r1.error) { setGlobalError(r1.error); return; }

      const n2 = normalizeOneSetScore(masc.score.trim())!;
      const r2 = await recordGameResult(match, results, "Masculino", masc.winner!, n2, "ORG");
      if (r2 && "error" in r2 && r2.error) { setGlobalError(r2.error); return; }

      if (mistaRequired && mista.winner) {
        const n3 = normalizeOneSetScore(mista.score.trim())!;
        await recordGameResult(match, results, "Mista", mista.winner, n3, "ORG");
      }

      console.log("RESULT_SAVE_SUCCESS", {
        matchId: match.id,
        winner: dispA > dispB
          ? (match.team_a_abbreviation || match.team_a_name)
          : (match.team_b_abbreviation || match.team_b_name),
        scoreA: dispA,
        scoreB: dispB,
      });
      setSaved(true);
      onChanged();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("RESULT_SAVE_ERROR", { matchId: match.id, error: msg });
      setGlobalError("Erro ao salvar. Tire print e envie para a organização.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForceReady() {
    setForceBusy(true);
    await upsertPresence(match, "a", { admin_confirmed: true });
    await upsertPresence(match, "b", { admin_confirmed: true });
    await advanceMatchStatus(match, "Pronto para quadra");
    setForceBusy(false);
    onChanged();
  }

  async function handleWO(winner: "a" | "b") {
    if (!woKind) return;
    setWoBusy(true);
    await recordWalkover(match, woKind, winner, results);
    setWoBusy(false);
    setWoKind(null);
    onChanged();
  }

  function WinnerBtn({
    side,
    state,
    onChange,
  }: {
    side: "a" | "b";
    state: GameState;
    onChange: (s: GameState) => void;
  }) {
    const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
    const name =
      side === "a"
        ? match.team_a_abbreviation || match.team_a_name
        : match.team_b_abbreviation || match.team_b_name;
    const active = state.winner === side;
    return (
      <button
        type="button"
        onClick={() => onChange({ ...state, winner: side, error: null })}
        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-extrabold transition ${
          active ? "border-coral bg-coral text-branco-quente" : "border-white/15 bg-white/5 text-cream/80"
        }`}
      >
        {flag || ""} {name}
      </button>
    );
  }

  function GameBlock({
    label,
    state,
    onChange,
    dimmed,
  }: {
    label: string;
    state: GameState;
    onChange: (s: GameState) => void;
    dimmed?: boolean;
  }) {
    return (
      <div
        className={`space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${
          dimmed ? "pointer-events-none opacity-40" : ""
        }`}
      >
        <p className="text-xs font-extrabold uppercase tracking-wider text-cream/60">{label}</p>
        <div className="flex gap-2">
          <WinnerBtn side="a" state={state} onChange={onChange} />
          <WinnerBtn side="b" state={state} onChange={onChange} />
        </div>
        <FormInput
          label={`Placar — ex: ${oneSetScoreInputPlaceholder()}`}
          value={state.score}
          onChange={(e) => onChange({ ...state, score: e.target.value, error: null })}
          placeholder={oneSetScoreInputPlaceholder()}
        />
        {state.error && <p className="text-xs font-bold text-coral">{state.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
            {[
              match.category_name && `Cat. ${match.category_name}`,
              match.group_or_phase,
              match.round,
              match.court && `Quadra: ${match.court}`,
            ]
              .filter(Boolean)
              .join(" · ") || "Confronto"}
          </p>
          <p className="text-xl font-extrabold text-branco-quente leading-tight">
            {match.team_a_flag} {match.team_a_abbreviation || match.team_a_name}
            <span className="mx-2 text-cream/30">×</span>
            {match.team_b_abbreviation || match.team_b_name} {match.team_b_flag}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-extrabold text-cream/70 transition hover:border-white/40 hover:text-cream active:scale-95"
          >
            ✕ Fechar
          </button>
          <StatusPill status={status} />
        </div>
      </div>

      {/* ── Bloco 1: Placar ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
        {hasScore ? (
          <>
            <p className="font-display text-4xl font-extrabold tabular-nums text-branco-quente">
              {match.score_team_a}{" "}
              <span className="text-cream/30">×</span>{" "}
              {match.score_team_b}
            </p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
              {(match.score_team_a ?? 0) > (match.score_team_b ?? 0)
                ? `${match.team_a_abbreviation || match.team_a_name} vence`
                : (match.score_team_b ?? 0) > (match.score_team_a ?? 0)
                  ? `${match.team_b_abbreviation || match.team_b_name} vence`
                  : "Confronto em andamento"}
            </p>
          </>
        ) : (
          <p className="text-sm font-bold text-cream/40">Resultado ainda não lançado.</p>
        )}
      </div>

      {/* ── Bloco 2: Escalações ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">Escalações</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <LineupCard match={match} side="a" lineups={lineups} />
          <LineupCard match={match} side="b" lineups={lineups} />
        </div>
      </div>

      {/* ── Bloco 3: Presença ── */}
      {showPresence && (
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">Presença na arena</p>
          <PresenceRow match={match} presence={presence} side="a" onChanged={onChanged} />
          <PresenceRow match={match} presence={presence} side="b" onChanged={onChanged} />
        </div>
      )}

      {/* ── Bloco 4: Resultado ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">
          {finished ? "Resultado final" : "Lançar resultado"}
        </p>

        {saved ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-5 text-center">
            <p className="text-xl font-extrabold text-emerald-300">✓ Resultado salvo!</p>
          </div>
        ) : (
          <>
            <GameBlock label="Jogo Feminino" state={fem} onChange={setFem} />
            <GameBlock label="Jogo Masculino" state={masc} onChange={setMasc} />

            {mistaRequired ? (
              <>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-extrabold text-amber-300">
                  ⚖️ Empate 1×1 — a mista é obrigatória para decidir o confronto.
                </div>
                <GameBlock label="Jogo Mista (obrigatório)" state={mista} onChange={setMista} />
              </>
            ) : (
              <p className="text-center text-[11px] font-bold text-cream/40">
                Mista só se feminino e masculino terminarem 1×1.
              </p>
            )}

            {(fem.winner || masc.winner) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
                  Placar do confronto
                </p>
                <p className="font-display text-3xl text-branco-quente">
                  {dispA} <span className="text-cream/40">×</span> {dispB}
                </p>
              </div>
            )}

            <p className="text-center text-[10px] font-semibold text-cream/40">
              {oneSetScoreHelpText()} {oneSetScoreExamples()}
            </p>

            {globalError && (
              <div className="rounded-2xl border border-coral/30 bg-coral/10 px-3 py-2">
                <p className="text-sm font-bold text-coral">{globalError}</p>
              </div>
            )}

            <Button full onClick={handleSaveResult} disabled={busy}>
              {busy ? "Salvando…" : finished ? "Corrigir resultado" : "Salvar resultado"}
            </Button>
          </>
        )}
      </div>

      {/* ── Ações avançadas ── */}
      <div className="space-y-2 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-cream/50">
            Ações avançadas
          </span>
          <span className="text-[11px] font-extrabold text-coral">{showAdvanced ? "Fechar" : "Abrir"}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-2">
            {canForce && (
              <Button variant="ghost" full disabled={forceBusy} onClick={handleForceReady}>
                {forceBusy ? "…" : "⏩ Forçar pronto para quadra"}
              </Button>
            )}

            {!finished &&
              (!woKind ? (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 !text-rose-300"
                    onClick={() => setWoKind("W.O.")}
                  >
                    Marcar W.O.
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 !text-rose-300"
                    onClick={() => setWoKind("Desistência")}
                  >
                    Desistência
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
                    {woKind} — quem é o vencedor?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["a", "b"] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        disabled={woBusy}
                        onClick={() => handleWO(side)}
                        className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-xs font-extrabold text-cream/80 transition active:scale-[0.98]"
                      >
                        {(side === "a" ? match.team_a_flag : match.team_b_flag) || ""}{" "}
                        {sideTeamName(match, side)}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" full disabled={woBusy} onClick={() => setWoKind(null)}>
                    Cancelar
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Modal wrapper ----
export default function MatchDetailsModal({ isOpen, onClose, match, ...rest }: Props) {
  if (!isOpen || !match) return null;

  console.log("DETAILS_MODAL_OPEN", {
    matchId: match.id,
    matchKey: `${match.team_a_name}x${match.team_b_name}`,
    categoria: match.category_name,
    grupo: match.group_or_phase,
    equipeA: match.team_a_name,
    equipeB: match.team_b_name,
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-3xl border border-white/15 bg-roxo-escuro p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* key=match.id garante reset de todo estado ao trocar de confronto */}
        <ModalContent key={match.id} match={match} onClose={onClose} {...rest} />
      </div>
    </div>
  );
}
