// ResultModal — modal centralizado para inserir ou corrigir o resultado de um confronto.
// Usado pelo capitão e pela organização. Não altera o fluxo de escalação ou quadra.
import { useState } from "react";
import Button from "./Button";
import FormInput from "./FormInput";
import {
  normalizeOneSetScore,
  oneSetScoreErrorText,
  oneSetScoreExamples,
  oneSetScoreHelpText,
  oneSetScoreInputPlaceholder,
  parseScoreSets,
  resultsFor,
  sideTeamName,
  winnerSide,
} from "../lib/engine";
import { recordGameResult } from "../lib/actions";
import type { Match, Result } from "../lib/types";

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  results: Result[];
  role: "captain" | "org";
  captainTeamName?: string;
  onChanged: () => void;
}

interface GameState {
  winner: "a" | "b" | null;
  score: string;
  error: string | null;
}

const empty = (): GameState => ({ winner: null, score: "", error: null });

function initFromResult(match: Match, r: Result | null): GameState {
  if (!r) return empty();
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

export default function ResultModal({
  isOpen,
  onClose,
  match,
  results,
  role,
  captainTeamName,
  onChanged,
}: ResultModalProps) {
  const games = resultsFor(match, results);
  const [fem, setFem] = useState<GameState>(() => initFromResult(match, games.fem));
  const [masc, setMasc] = useState<GameState>(() => initFromResult(match, games.masc));
  const [mista, setMista] = useState<GameState>(() => initFromResult(match, games.mista));
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const actor = role === "captain" && captainTeamName ? `CAPITAO:${captainTeamName}` : "ORG";

  const femWinsA = fem.winner === "a" ? 1 : 0;
  const femWinsB = fem.winner === "b" ? 1 : 0;
  const mascWinsA = masc.winner === "a" ? 1 : 0;
  const mascWinsB = masc.winner === "b" ? 1 : 0;
  const scoreA = femWinsA + mascWinsA;
  const scoreB = femWinsB + mascWinsB;
  const mistaRequired = fem.winner !== null && masc.winner !== null && scoreA === 1 && scoreB === 1;
  const dispA = scoreA + (mista.winner === "a" ? 1 : 0);
  const dispB = scoreB + (mista.winner === "b" ? 1 : 0);

  async function handleSave() {
    setGlobalError(null);
    let hasError = false;

    const femErr = !fem.winner ? "Selecione o vencedor do jogo feminino." : validateScore(fem.score);
    const mascErr = !masc.winner ? "Selecione o vencedor do jogo masculino." : validateScore(masc.score);
    const mistaErr =
      mistaRequired && !mista.winner
        ? "Como o confronto ficou 1×1, informe também o resultado da mista."
        : mistaRequired
          ? validateScore(mista.score)
          : null;

    if (femErr) { setFem((p) => ({ ...p, error: femErr })); hasError = true; }
    if (mascErr) { setMasc((p) => ({ ...p, error: mascErr })); hasError = true; }
    if (mistaErr) { setMista((p) => ({ ...p, error: mistaErr })); hasError = true; }
    if (hasError) return;

    console.log("RESULT_SAVE_ATTEMPT", { matchId: match.id, actor, scoreA, scoreB });
    setBusy(true);
    try {
      const freshResults = results; // caller keeps results up-to-date via polling

      const normFem = normalizeOneSetScore(fem.score.trim())!;
      const resFem = await recordGameResult(match, freshResults, "Feminino", fem.winner!, normFem, actor);
      if (resFem && "error" in resFem && resFem.error) {
        setGlobalError(resFem.error);
        return;
      }

      const normMasc = normalizeOneSetScore(masc.score.trim())!;
      const resMasc = await recordGameResult(match, freshResults, "Masculino", masc.winner!, normMasc, actor);
      if (resMasc && "error" in resMasc && resMasc.error) {
        setGlobalError(resMasc.error);
        return;
      }

      if (mistaRequired && mista.winner) {
        const normMista = normalizeOneSetScore(mista.score.trim())!;
        await recordGameResult(match, freshResults, "Mista", mista.winner, normMista, actor);
      }

      console.log("RESULT_SAVE_SUCCESS", { matchId: match.id, actor, scoreA: dispA, scoreB: dispB });
      onChanged();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("RESULT_SAVE_ERROR", { matchId: match.id, error: msg });
      setGlobalError("Erro ao salvar. Tire print e envie para a organização.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  function WinnerBtn({ side, state, onChange }: { side: "a" | "b"; state: GameState; onChange: (s: GameState) => void }) {
    const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
    const name = sideTeamName(match, side);
    const active = state.winner === side;
    return (
      <button
        type="button"
        onClick={() => onChange({ ...state, winner: side, error: null })}
        className={`flex-1 rounded-xl border px-3 py-3 text-sm font-extrabold transition ${
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
      <div className={`space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
        <p className="text-xs font-extrabold uppercase tracking-wider text-cream/60">{label}</p>
        <div className="flex gap-2">
          <WinnerBtn side="a" state={state} onChange={onChange} />
          <WinnerBtn side="b" state={state} onChange={onChange} />
        </div>
        <FormInput
          label={`Placar (ex: ${oneSetScoreInputPlaceholder()})`}
          value={state.score}
          onChange={(e) => onChange({ ...state, score: e.target.value, error: null })}
          placeholder={oneSetScoreInputPlaceholder()}
        />
        {state.error && <p className="text-xs font-bold text-coral">{state.error}</p>}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/15 bg-roxo-escuro p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="mb-4 space-y-1 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
            {[match.category_name && `Cat. ${match.category_name}`, match.group_or_phase]
              .filter(Boolean)
              .join(" · ") || "Resultado do confronto"}
          </p>
          <p className="text-lg font-extrabold text-branco-quente">
            {match.team_a_flag || ""} {match.team_a_abbreviation || match.team_a_name}{" "}
            <span className="text-cream/40">×</span>{" "}
            {match.team_b_flag || ""} {match.team_b_abbreviation || match.team_b_name}
          </p>
          {role === "captain" && (
            <p className="text-xs font-bold text-amber-300">
              Resultado será enviado para a organização.
            </p>
          )}
        </div>

        {saved ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-2xl font-extrabold text-emerald-300">✓ Resultado salvo!</p>
            {role === "captain" && (
              <p className="text-sm font-semibold text-cream/60">Resultado informado para a organização.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
                Mista só é necessária se feminino e masculino terminarem 1×1.
              </p>
            )}

            {/* Placar calculado */}
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

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={busy}>
                {busy ? "Salvando…" : "Salvar resultado"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
