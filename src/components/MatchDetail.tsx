// ============================================================================
// MatchDetail — painel operacional de um confronto (Org → OPS).
// Conduz o fluxo: escalações → presença (ADM confirma) → liberação de quadra
// (1 ou 2 quadras no modo simultâneo) → jogo → parciais com mista condicional.
// ============================================================================
import { useMemo, useState } from "react";
import Button from "./Button";
import FormInput, { FormSelect } from "./FormInput";
import StatusPill from "./StatusPill";
import {
  advanceMatchStatus,
  recordGameResult,
  recordWalkover,
  releaseCourts,
  resolveContest,
  startMatch,
  updateMatchAdmin,
  upsertPresence,
} from "../lib/actions";
import {
  courtLabel,
  isCourtFree,
  needsMista,
  resultsFor,
  sideLineup,
  sidePresence,
  sideTeamName,
  winnerSide,
  type GameType,
} from "../lib/engine";
import { MATCH_STATUSES, type Court, type Lineup, type Match, type MatchStatus, type Presence, type Result } from "../lib/types";

interface MatchDetailProps {
  match: Match;
  courts: Court[];
  lineups: Lineup[];
  presence: Presence[];
  results: Result[];
  onChanged: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">{children}</p>
  );
}

function AdminEditBlock({ match, onChanged }: { match: Match; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(match.scheduled_time ?? "");
  const [court, setCourt] = useState(match.court ?? "");
  const [mode, setMode] = useState(match.match_mode || "Sequencial");
  const [status, setStatus] = useState<MatchStatus>(match.match_status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const err = await updateMatchAdmin(match, {
      scheduled_time: time.trim() || null,
      court: court.trim() || null,
      match_mode: mode,
      match_status: status,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
    onChanged();
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-cream/60">
          Editar confronto
        </span>
        <span className="text-sm font-extrabold text-coral">{open ? "Fechar" : "Abrir"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Horário" value={time} onChange={(e) => setTime(e.target.value)} placeholder="09:30" />
            <FormInput label="Quadra" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Quadra 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Modo" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="Sequencial">Sequencial</option>
              <option value="Simultâneo">Simultâneo</option>
            </FormSelect>
            <FormSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value as MatchStatus)}>
              {MATCH_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </FormSelect>
          </div>
          {error && <p className="text-xs font-bold text-coral">{error}</p>}
          <Button full disabled={busy} onClick={save}>
            {busy ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------- Presença ----------------
function PresenceBlock({ match, presence, onChanged }: { match: Match; presence: Presence[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function confirm(side: "a" | "b") {
    setBusy(side);
    await upsertPresence(match, side, { admin_confirmed: true });
    const other = sidePresence(match, presence, side === "a" ? "b" : "a");
    if (other?.admin_confirmed) {
      await advanceMatchStatus(match, "Pronto para quadra");
    } else {
      await advanceMatchStatus(match, "Aguardando presença");
    }
    setBusy(null);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <SectionTitle>Presença na arena</SectionTitle>
      {(["a", "b"] as const).map((side) => {
        const p = sidePresence(match, presence, side);
        const confirmed = !!p?.admin_confirmed;
        return (
          <div key={side} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span className="text-xl">{side === "a" ? match.team_a_flag : match.team_b_flag}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-branco-quente">{sideTeamName(match, side)}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cream/50">
                {confirmed ? "✓ Presença confirmada pelo ADM" : p?.captain_ready ? "Capitão avisou: pronto na arena" : "Sem sinal do capitão"}
              </p>
            </div>
            {confirmed ? (
              <span className="text-lg text-emerald-300">✓</span>
            ) : (
              <Button
                variant="secondary"
                className="!px-3 !py-2 !text-[10px]"
                disabled={busy !== null}
                onClick={() => confirm(side)}
              >
                {busy === side ? "…" : "Confirmar"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Liberação de quadra ----------------
function CourtRelease({ match, courts, onChanged }: { match: Match; courts: Court[]; onChanged: () => void }) {
  const simultaneous = match.match_mode === "Simultâneo";
  const maxCourts = simultaneous ? 2 : 1;
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const freeCourts = courts.filter(isCourtFree);

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev.slice(-(maxCourts - 1)), id],
    );
  }

  async function release() {
    const chosen = courts.filter((c) => picked.includes(c.id));
    if (chosen.length === 0) return;
    setBusy(true);
    await releaseCourts(match, chosen);
    setBusy(false);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <SectionTitle>
        Liberar quadra {simultaneous ? "— modo simultâneo: escolha 2 (fem + masc em paralelo)" : ""}
      </SectionTitle>
      {simultaneous && freeCourts.length >= 2 && picked.length < 2 && (
        <p className="text-[11px] font-bold text-emerald-300">
          {freeCourts.length} quadras livres — dá para jogar feminino e masculino ao mesmo tempo.
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {courts.map((c) => {
          const free = isCourtFree(c);
          const active = picked.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={!free}
              onClick={() => toggle(c.id)}
              className={`rounded-xl border px-2 py-2.5 text-xs font-extrabold transition ${
                active
                  ? "border-coral bg-coral text-branco-quente"
                  : free
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-cream/30"
              }`}
            >
              Q{c.court_number}
              {c.court_status === "Escape" && <span className="block text-[8px] tracking-wider">ESCAPE</span>}
            </button>
          );
        })}
      </div>
      <Button full disabled={busy || picked.length === 0} onClick={release}>
        {busy ? "Liberando…" : `Liberar ${picked.length > 1 ? "quadras" : "quadra"}`}
      </Button>
    </div>
  );
}

// ---------------- Parciais / mista condicional ----------------
function GameResultForm({
  match,
  results,
  gameType,
  disabled,
  onChanged,
}: {
  match: Match;
  results: Result[];
  gameType: GameType;
  disabled?: boolean;
  onChanged: () => void;
}) {
  const games = resultsFor(match, results);
  const key = gameType === "Feminino" ? "fem" : gameType === "Masculino" ? "masc" : "mista";
  const recorded = games[key as keyof typeof games];
  const recordedSide = winnerSide(match, recorded);

  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!winner) return;
    const cleanScore = score.trim();
    const parsed = cleanScore.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (!parsed) {
      setError("Informe o placar no formato 6-3.");
      return;
    }
    const winnerGames = Number(parsed[1]);
    const loserGames = Number(parsed[2]);
    if (winnerGames <= loserGames) {
      setError("Use a convenção vencedor-perdedor. O primeiro número precisa ser maior.");
      return;
    }
    setError(null);
    setBusy(true);
    await recordGameResult(match, results, gameType, winner, `${winnerGames}-${loserGames}`);
    setBusy(false);
    onChanged();
  }

  if (recordedSide) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-cream/60">{gameType}</span>
        <span className="text-sm font-extrabold text-branco-quente">
          {sideTeamName(match, recordedSide)} <span className="font-mono text-coral">{recorded?.score || "—"}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${disabled ? "opacity-40" : ""}`}>
      <p className="text-xs font-extrabold uppercase tracking-wider text-cream/60">{gameType}</p>
      <div className="grid grid-cols-2 gap-2">
        {(["a", "b"] as const).map((side) => (
          <button
            key={side}
            type="button"
            disabled={disabled}
            onClick={() => setWinner(side)}
            className={`rounded-xl border px-2 py-2 text-xs font-extrabold transition ${
              winner === side
                ? "border-coral bg-coral text-branco-quente"
                : "border-white/15 bg-white/5 text-cream/80"
            }`}
          >
            {(side === "a" ? match.team_a_flag : match.team_b_flag) || ""} {sideTeamName(match, side)}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormInput
            label="Placar (vencedor-perdedor)"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="6-3"
            disabled={disabled}
          />
        </div>
        <Button className="!px-4 !py-3" disabled={disabled || busy || !winner} onClick={save}>
          {busy ? "…" : "Salvar"}
        </Button>
      </div>
      {error && <p className="text-xs font-bold text-coral">{error}</p>}
    </div>
  );
}

function ResultsBlock({ match, results, onChanged }: { match: Match; results: Result[]; onChanged: () => void }) {
  const games = resultsFor(match, results);
  const femDone = !!winnerSide(match, games.fem);
  const mascDone = !!winnerSide(match, games.masc);
  const mistaTime = needsMista(match, results);

  return (
    <div className="space-y-2">
      <SectionTitle>Parciais</SectionTitle>
      <GameResultForm match={match} results={results} gameType="Feminino" onChanged={onChanged} />
      <GameResultForm match={match} results={results} gameType="Masculino" onChanged={onChanged} />
      {mistaTime ? (
        <>
          <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-extrabold text-amber-300">
            ⚖️ Empate 1×1 — a dupla mista decide o confronto.
          </p>
          <GameResultForm match={match} results={results} gameType="Mista" onChanged={onChanged} />
        </>
      ) : (
        !(femDone && mascDone) && (
          <p className="text-[11px] font-bold text-cream/40">
            Mista é condicional: só entra se feminino e masculino empatarem 1×1.
          </p>
        )
      )}
    </div>
  );
}

// ---------------- Contestação (Fase 3) ----------------
function ContestResolveBlock({ match, onChanged }: { match: Match; onChanged: () => void }) {
  const [busy, setBusy] = useState<"manter" | "reabrir" | null>(null);

  async function resolve(decision: "manter" | "reabrir") {
    setBusy(decision);
    await resolveContest(match, decision);
    setBusy(null);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <SectionTitle>Resultado contestado</SectionTitle>
      <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2.5 text-sm font-bold text-rose-300">
        ⚠ Motivo do capitão: <span className="font-semibold text-rose-200">{match.contest_reason || "sem detalhes"}</span>
      </p>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy !== null} onClick={() => resolve("manter")}>
          {busy === "manter" ? "…" : "✓ Manter resultado"}
        </Button>
        <Button variant="secondary" className="flex-1" disabled={busy !== null} onClick={() => resolve("reabrir")}>
          {busy === "reabrir" ? "…" : "↺ Reabrir confronto"}
        </Button>
      </div>
      <p className="text-[11px] font-bold text-cream/40">
        Reabrir apaga as parciais lançadas — o confronto volta para "Em andamento".
      </p>
    </div>
  );
}

// ---------------- W.O. / Desistência (Fase 3) ----------------
function WalkoverBlock({ match, results, onChanged }: { match: Match; results: Result[]; onChanged: () => void }) {
  const [kind, setKind] = useState<"W.O." | "Desistência" | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm(winner: "a" | "b") {
    if (!kind) return;
    setBusy(true);
    await recordWalkover(match, kind, winner, results);
    setBusy(false);
    setKind(null);
    onChanged();
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <SectionTitle>Encerramento administrativo</SectionTitle>
      {!kind ? (
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 !text-rose-300" onClick={() => setKind("W.O.")}>
            Marcar W.O.
          </Button>
          <Button variant="ghost" className="flex-1 !text-rose-300" onClick={() => setKind("Desistência")}>
            Desistência
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
            {kind} — quem é o vencedor?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b"] as const).map((side) => (
              <button
                key={side}
                type="button"
                disabled={busy}
                onClick={() => confirm(side)}
                className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-xs font-extrabold text-cream/80 transition active:scale-[0.98]"
              >
                {(side === "a" ? match.team_a_flag : match.team_b_flag) || ""} {sideTeamName(match, side)}
              </button>
            ))}
          </div>
          <Button variant="ghost" full disabled={busy} onClick={() => setKind(null)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------- Painel ----------------
export default function MatchDetail({ match, courts, lineups, presence, results, onChanged }: MatchDetailProps) {
  const status = match.match_status;
  const games = useMemo(() => resultsFor(match, results), [match, results]);

  const lineupRows = (["a", "b"] as const).map((side) => ({
    side,
    name: sideTeamName(match, side),
    lineup: sideLineup(match, lineups, side),
  }));

  const showPresence = ["Escalação parcial", "Escalações recebidas", "Aguardando presença"].includes(status) ||
    (status === "Aguardando escalação" && lineups.some((l) => l.match_id === match.id));
  const showRelease = status === "Pronto para quadra";
  const showStart = status === "Liberado para quadra";
  const showResults = status === "Em andamento";
  const contested = status === "Resultado contestado";
  const walkover = status === "W.O." || status === "Desistência";
  const finished = status === "Finalizado" || contested || walkover;

  return (
    <div className="animate-fade-in-up space-y-4 rounded-3xl border border-coral/40 bg-white/[0.05] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold uppercase tracking-wide text-coral">
          Operação — {match.team_a_abbreviation || match.team_a_name} × {match.team_b_abbreviation || match.team_b_name}
        </p>
        <StatusPill status={status} />
      </div>

      <AdminEditBlock match={match} onChanged={onChanged} />

      {/* Escalações recebidas */}
      <div className="space-y-2">
        <SectionTitle>Escalações</SectionTitle>
        {lineupRows.map(({ side, name, lineup }) => (
          <div key={side} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <span className="text-sm font-bold text-branco-quente">{name}</span>
            <StatusPill status={lineup?.lineup_status === "Enviada" ? "Enviada" : lineup ? "Rascunho" : "Pendente"} />
          </div>
        ))}
      </div>

      {showPresence && <PresenceBlock match={match} presence={presence} onChanged={onChanged} />}

      {/* Atalho do ADM: destrava o confronto quando o fluxo do capitão não aconteceu
          (capitão sem celular, escalação em papel etc.) */}
      {!showRelease && !showStart && !showResults && !finished && (
        <Button
          variant="ghost"
          full
          onClick={async () => {
            await upsertPresence(match, "a", { admin_confirmed: true });
            await upsertPresence(match, "b", { admin_confirmed: true });
            await advanceMatchStatus(match, "Pronto para quadra");
            onChanged();
          }}
        >
          ⏩ Forçar pronto para quadra
        </Button>
      )}

      {showRelease && <CourtRelease match={match} courts={courts} onChanged={onChanged} />}

      {showStart && (
        <div className="space-y-2">
          <SectionTitle>Quadra liberada — {match.court}</SectionTitle>
          <Button
            full
            onClick={async () => {
              await startMatch(match);
              onChanged();
            }}
          >
            ▶ Iniciar jogo
          </Button>
        </div>
      )}

      {showResults && <ResultsBlock match={match} results={results} onChanged={onChanged} />}

      {contested && <ContestResolveBlock match={match} onChanged={onChanged} />}

      {finished && (
        <div className="space-y-2">
          <SectionTitle>{walkover ? `Resultado final — ${status}` : "Resultado final"}</SectionTitle>
          <p className="font-display text-2xl text-branco-quente">
            {match.score_team_a} × {match.score_team_b}
          </p>
          {(["fem", "masc", "mista"] as const).map((k) => {
            const r = games[k];
            const w = winnerSide(match, r);
            if (!w) return null;
            const label = k === "fem" ? "Feminino" : k === "masc" ? "Masculino" : "Mista";
            return (
              <p key={k} className="text-sm font-semibold text-cream/70">
                {label}: <span className="font-extrabold text-branco-quente">{sideTeamName(match, w)}</span>{" "}
                <span className="font-mono text-coral">{r?.score || ""}</span>
              </p>
            );
          })}
        </div>
      )}

      {/* W.O. / Desistência: disponível enquanto o confronto não terminou em quadra */}
      {!finished && <WalkoverBlock match={match} results={results} onChanged={onChanged} />}
    </div>
  );
}
