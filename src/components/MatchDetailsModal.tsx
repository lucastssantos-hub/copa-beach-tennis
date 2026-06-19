// MatchDetailsModal — modal operacional completo do confronto para o painel OPS.
// Entrada de resultado por campos separados (gameA / gameB) em vez de texto livre.
import { useMemo, useState } from "react";
import Button from "./Button";
import StatusPill from "./StatusPill";
import {
  advanceMatchStatus,
  recordGameResult,
  recordWalkover,
  upsertPresence,
} from "../lib/actions";
import {
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

// ============================================================
// Helpers de placar
// ============================================================

/** Verifica se (a, b) é um placar válido de 1 set. Não valida tiebreak aqui. */
function isValidSetScore(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a === b) return false;
  const [w, l] = a > b ? [a, b] : [b, a];
  if (w === 6 && l >= 0 && l <= 4) return true;
  if (w === 7 && l === 5) return true;
  if (w === 7 && l === 6) return true;
  return false;
}

/** Tiebreak é obrigatório apenas quando 7-6. */
function needsTiebreak(a: number, b: number): boolean {
  return (a === 7 && b === 6) || (a === 6 && b === 7);
}

// ============================================================
// Estado de cada jogo
// ============================================================

interface GameState {
  scoreA: string;     // games da equipe A (campo do ADM)
  scoreB: string;     // games da equipe B (campo do ADM)
  tiebreak: string;   // pontos do perdedor no tiebreak (apenas 7-6)
  error: string | null;
}

function emptyGame(): GameState {
  return { scoreA: "", scoreB: "", tiebreak: "", error: null };
}

/** Recria o estado a partir de um resultado já salvo (winner-loser format). */
function initGame(match: Match, r: Result | null): GameState {
  if (!r || !r.score) return emptyGame();
  const w = winnerSide(match, r);
  if (!w) return emptyGame();

  const m = r.score.match(/^(\d+)-(\d+)(?:\((\d+)\))?$/);
  if (!m) return emptyGame();

  const winnerGames = parseInt(m[1]);
  const loserGames = parseInt(m[2]);
  const tb = m[3] ?? "";

  if (w === "a") {
    return { scoreA: String(winnerGames), scoreB: String(loserGames), tiebreak: tb, error: null };
  } else {
    return { scoreA: String(loserGames), scoreB: String(winnerGames), tiebreak: tb, error: null };
  }
}

/** Deriva o vencedor pelo placar, ou null se inválido. */
function deriveWinner(state: GameState): "a" | "b" | null {
  const a = parseInt(state.scoreA);
  const b = parseInt(state.scoreB);
  if (isNaN(a) || isNaN(b) || !isValidSetScore(a, b)) return null;
  return a > b ? "a" : "b";
}

/** Monta o scoreDisplay no formato LetzPlay (winner-loser). */
function buildScoreDisplay(state: GameState): string {
  const a = parseInt(state.scoreA);
  const b = parseInt(state.scoreB);
  const [w, l] = a > b ? [a, b] : [b, a];
  if (needsTiebreak(a, b) && state.tiebreak.trim()) {
    return `${w}-${l}(${state.tiebreak.trim()})`;
  }
  return `${w}-${l}`;
}

/** Valida o estado de um jogo. Retorna mensagem de erro ou null. */
function validateGame(state: GameState, label: string): string | null {
  if (!state.scoreA.trim() || !state.scoreB.trim()) {
    return `Informe o placar do ${label}.`;
  }
  const a = parseInt(state.scoreA);
  const b = parseInt(state.scoreB);
  if (isNaN(a) || isNaN(b)) return `Placar inválido no ${label}.`;
  if (!isValidSetScore(a, b)) return `Placar inválido no ${label}.`;
  if (needsTiebreak(a, b)) {
    if (!state.tiebreak.trim()) return `Informe os pontos do tiebreak no ${label}.`;
    const tb = parseInt(state.tiebreak);
    if (isNaN(tb) || tb < 0 || tb > 99) return `Tiebreak inválido no ${label}.`;
  }
  return null;
}

// ============================================================
// Bloco de escalação (leitura)
// ============================================================

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
          sent ? "bg-emerald-500/20 text-emerald-300"
               : hasAny ? "bg-amber-500/20 text-amber-300"
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

// ============================================================
// Presença
// ============================================================

function PresenceRow({
  match, presence, side, onChanged,
}: {
  match: Match; presence: Presence[]; side: "a" | "b"; onChanged: () => void;
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
          {confirmed ? "✓ Presente"
           : p?.captain_ready ? "Capitão avisou: pronto na arena"
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

// ============================================================
// Bloco de entrada de resultado por game
// ============================================================

function ScoreInput({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-cream/60 text-center leading-tight">
        {label}
      </p>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={7}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="h-16 w-full max-w-[88px] rounded-2xl border border-white/20 bg-white/5 text-center text-3xl font-extrabold tabular-nums text-branco-quente outline-none transition focus:border-coral disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}

function GameBlock({
  label, state, onChange, match, dimmed,
}: {
  label: string;
  state: GameState;
  onChange: (s: GameState) => void;
  match: Match;
  dimmed?: boolean;
}) {
  const nameA = match.team_a_abbreviation || match.team_a_name;
  const nameB = match.team_b_abbreviation || match.team_b_name;
  const flagA = match.team_a_flag ?? "";
  const flagB = match.team_b_flag ?? "";

  const aNum = parseInt(state.scoreA);
  const bNum = parseInt(state.scoreB);
  const validShape = !isNaN(aNum) && !isNaN(bNum) && isValidSetScore(aNum, bNum);
  const showTiebreak = !isNaN(aNum) && !isNaN(bNum) && needsTiebreak(aNum, bNum);
  const winner = validShape ? (aNum > bNum ? "a" : "b") : null;

  function setA(v: string) { onChange({ ...state, scoreA: v, error: null }); }
  function setB(v: string) { onChange({ ...state, scoreB: v, error: null }); }
  function setTb(v: string) { onChange({ ...state, tiebreak: v, error: null }); }

  return (
    <div className={`space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${dimmed ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-xs font-extrabold uppercase tracking-wider text-cream/60">{label}</p>

      {/* Campos de games lado a lado */}
      <div className="flex items-end justify-around gap-2">
        <ScoreInput label={`${flagA} ${nameA}`} value={state.scoreA} onChange={setA} disabled={dimmed} />

        <span className="mb-4 text-2xl font-extrabold text-cream/20 select-none">×</span>

        <ScoreInput label={`${nameB} ${flagB}`} value={state.scoreB} onChange={setB} disabled={dimmed} />
      </div>

      {/* Campo de tiebreak (apenas 7-6) */}
      {showTiebreak && (
        <div className="space-y-1.5 rounded-xl border border-coral/20 bg-coral/5 p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-coral">
            Tiebreak — pontos do perdedor (obrigatório)
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={state.tiebreak}
              onChange={(e) => setTb(e.target.value)}
              placeholder="ex: 4"
              className="h-12 w-24 rounded-xl border border-coral/40 bg-white/5 text-center text-xl font-extrabold tabular-nums text-branco-quente outline-none transition focus:border-coral [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <p className="text-[10px] font-semibold text-cream/50">
              Placar: {aNum > bNum ? `${flagA} ${nameA}` : `${nameB} ${flagB}`} 7-6({state.tiebreak || "?"})
            </p>
          </div>
        </div>
      )}

      {/* Vencedor automático */}
      {winner ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
          <span className="text-emerald-300 text-sm">✓</span>
          <p className="text-[11px] font-extrabold text-emerald-300">
            Vencedor:{" "}
            {winner === "a" ? `${flagA} ${nameA}` : `${nameB} ${flagB}`}
            {showTiebreak && state.tiebreak.trim() && (
              <span className="ml-1 font-mono text-cream/70">
                ({buildScoreDisplay(state)})
              </span>
            )}
            {!showTiebreak && validShape && (
              <span className="ml-1 font-mono text-cream/70">
                ({buildScoreDisplay(state)})
              </span>
            )}
          </p>
        </div>
      ) : (
        state.scoreA !== "" && state.scoreB !== "" && !isNaN(aNum) && !isNaN(bNum) && (
          <p className="text-[11px] font-bold text-amber-300">
            ⚠ Placar inválido — ex: 6-3, 6-4, 7-5, 7-6(4)
          </p>
        )
      )}

      {state.error && (
        <p className="text-xs font-bold text-coral">{state.error}</p>
      )}
    </div>
  );
}

// ============================================================
// Conteúdo interno (key=match.id reseta estado ao trocar de confronto)
// ============================================================

function ModalContent({
  match, lineups, presence, results, onChanged, onClose,
}: Omit<Props, "isOpen" | "courts">) {
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

  // Placar do confronto calculado em tempo real
  const femW = deriveWinner(fem);
  const mascW = deriveWinner(masc);
  const femWinsA = femW === "a" ? 1 : 0;
  const femWinsB = femW === "b" ? 1 : 0;
  const mascWinsA = mascW === "a" ? 1 : 0;
  const mascWinsB = mascW === "b" ? 1 : 0;
  const confScoreA = femWinsA + mascWinsA;
  const confScoreB = femWinsB + mascWinsB;
  const mistaRequired = femW !== null && mascW !== null && confScoreA === 1 && confScoreB === 1;
  const mistaW = deriveWinner(mista);
  const dispA = confScoreA + (mistaW === "a" ? 1 : 0);
  const dispB = confScoreB + (mistaW === "b" ? 1 : 0);

  const finished = ["Finalizado", "W.O.", "Desistência", "Resultado contestado"].includes(status);
  const showPresence = [
    "Escalação parcial", "Escalações recebidas", "Aguardando presença", "Aguardando escalação",
  ].includes(status);
  const canForce = ![
    "Pronto para quadra", "Liberado para quadra", "Em andamento",
    "Finalizado", "W.O.", "Desistência",
  ].includes(status);

  const hasScore = match.score_team_a !== null && match.score_team_b !== null;

  const nameA = match.team_a_abbreviation || match.team_a_name;
  const nameB = match.team_b_abbreviation || match.team_b_name;

  async function handleSaveResult() {
    setGlobalError(null);
    let hasError = false;

    const femErr = validateGame(fem, "feminino");
    const mascErr = validateGame(masc, "masculino");
    const curFemW = deriveWinner(fem);
    const curMascW = deriveWinner(masc);
    const curScoreA = (curFemW === "a" ? 1 : 0) + (curMascW === "a" ? 1 : 0);
    const curScoreB = (curFemW === "b" ? 1 : 0) + (curMascW === "b" ? 1 : 0);
    const curMistaReq = curFemW !== null && curMascW !== null && curScoreA === 1 && curScoreB === 1;
    const mistaErr = curMistaReq
      ? !deriveWinner(mista)
        ? "Como o confronto ficou 1×1, informe também a mista."
        : validateGame(mista, "mista")
      : null;

    if (femErr) { setFem((p) => ({ ...p, error: femErr })); hasError = true; }
    if (mascErr) { setMasc((p) => ({ ...p, error: mascErr })); hasError = true; }
    if (mistaErr) { setMista((p) => ({ ...p, error: mistaErr })); hasError = true; }
    if (hasError) return;

    const finalFemW = deriveWinner(fem)!;
    const finalMascW = deriveWinner(masc)!;
    const finalDispA = (finalFemW === "a" ? 1 : 0) + (finalMascW === "a" ? 1 : 0) + (mistaW === "a" ? 1 : 0);
    const finalDispB = (finalFemW === "b" ? 1 : 0) + (finalMascW === "b" ? 1 : 0) + (mistaW === "b" ? 1 : 0);

    console.log("RESULT_SAVE_ATTEMPT", {
      matchId: match.id,
      matchKey: `${match.team_a_name}x${match.team_b_name}`,
      femScore: buildScoreDisplay(fem),
      mascScore: buildScoreDisplay(masc),
      dispA: finalDispA,
      dispB: finalDispB,
    });

    setBusy(true);
    try {
      const r1 = await recordGameResult(match, results, "Feminino", finalFemW, buildScoreDisplay(fem), "ORG");
      if (r1 && "error" in r1 && r1.error) { setGlobalError(r1.error); return; }

      const r2 = await recordGameResult(match, results, "Masculino", finalMascW, buildScoreDisplay(masc), "ORG");
      if (r2 && "error" in r2 && r2.error) { setGlobalError(r2.error); return; }

      if (curMistaReq && deriveWinner(mista)) {
        await recordGameResult(match, results, "Mista", deriveWinner(mista)!, buildScoreDisplay(mista), "ORG");
      }

      console.log("RESULT_SAVE_SUCCESS", {
        matchId: match.id,
        winner: finalDispA > finalDispB ? nameA : nameB,
        scoreA: finalDispA,
        scoreB: finalDispB,
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

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
            {[
              match.category_name && `Cat. ${match.category_name}`,
              match.group_or_phase,
              match.round,
              match.court && `Quadra: ${match.court}`,
            ].filter(Boolean).join(" · ") || "Confronto"}
          </p>
          <p className="text-xl font-extrabold leading-tight text-branco-quente">
            {match.team_a_flag} {nameA}
            <span className="mx-2 text-cream/30">×</span>
            {nameB} {match.team_b_flag}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
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

      {/* ── Bloco 1: Placar atual ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
        {hasScore ? (
          <>
            <p className="font-display text-4xl font-extrabold tabular-nums text-branco-quente">
              {match.score_team_a} <span className="text-cream/30">×</span> {match.score_team_b}
            </p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
              {(match.score_team_a ?? 0) > (match.score_team_b ?? 0)
                ? `${nameA} vence`
                : (match.score_team_b ?? 0) > (match.score_team_a ?? 0)
                  ? `${nameB} vence`
                  : "Em andamento"}
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
      <div className="space-y-3">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">
          {finished ? "Resultado final" : "Lançar resultado"}
        </p>

        {saved ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-5 text-center">
            <p className="text-xl font-extrabold text-emerald-300">✓ Resultado salvo!</p>
          </div>
        ) : (
          <>
            <GameBlock label="Jogo Feminino" state={fem} onChange={setFem} match={match} />
            <GameBlock label="Jogo Masculino" state={masc} onChange={setMasc} match={match} />

            {/* Mista */}
            {mistaRequired ? (
              <>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-extrabold text-amber-300">
                  ⚖️ Empate 1×1 — a mista é obrigatória para decidir o confronto.
                </div>
                <GameBlock label="Jogo Mista (obrigatório)" state={mista} onChange={setMista} match={match} />
              </>
            ) : (
              femW !== null && mascW !== null && (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[11px] font-bold text-emerald-300/80">
                  {femW === mascW
                    ? `Mista não necessária — confronto definido em 2×0.`
                    : "Aguardando o masculino para saber se a mista é necessária."}
                </div>
              )
            )}

            {/* Resumo automático */}
            {(femW || mascW) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
                  {mistaRequired && !mistaW ? "Resultado parcial" : "Placar do confronto"}
                </p>
                <p className="font-display text-3xl text-branco-quente">
                  {dispA} <span className="text-cream/40">×</span> {dispB}
                </p>
                {dispA !== dispB && (
                  <p className="mt-1 text-[11px] font-extrabold text-emerald-300">
                    Vencedor: {dispA > dispB ? `${match.team_a_flag ?? ""} ${nameA}` : `${nameB} ${match.team_b_flag ?? ""}`}
                  </p>
                )}
              </div>
            )}

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
            {!finished && (
              !woKind ? (
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1 !text-rose-300" onClick={() => setWoKind("W.O.")}>
                    Marcar W.O.
                  </Button>
                  <Button variant="ghost" className="flex-1 !text-rose-300" onClick={() => setWoKind("Desistência")}>
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
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Modal wrapper
// ============================================================

export default function MatchDetailsModal({ isOpen, onClose, match, courts: _courts, ...rest }: Props) {
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
        {/* key=match.id reseta todo o estado ao trocar de confronto */}
        <ModalContent key={match.id} match={match} onClose={onClose} {...rest} />
      </div>
    </div>
  );
}
