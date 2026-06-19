// ============================================================================
// MatchReadinessCard — cartão operacional de prontidão (formato Lovable).
// Mostra num relance: status, placar, escalação por equipe (com ação
// inline de cobrar capitão), quadra, estado da mista e a ação
// principal contextual do confronto.
// ============================================================================
import { useState } from "react";
import StatusPill from "./StatusPill";
import {
  MIXED_LABEL,
  mixedState,
  sideLineup,
  sideTeamName,
} from "../lib/engine";
import { pokeCaptain, startMatch, updateMatchAdmin } from "../lib/actions";
import type { Court, Lineup, Match, Result } from "../lib/types";

type Side = "a" | "b";

interface MatchReadinessCardProps {
  match: Match;
  courts: Court[];
  lineups: Lineup[];
  results: Result[];
  selected: boolean;
  /** Alterna o painel de detalhe (toque no cartão). */
  onOpen: () => void;
  /** Garante o painel aberto (ação principal). */
  onEnsureOpen: () => void;
  onChanged: () => void;
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
        ok ? "bg-emerald-400/15 text-emerald-300" : "bg-coral/15 text-coral"
      }`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function SideStatus({
  match,
  side,
  lineups,
  busy,
  onPoke,
}: {
  match: Match;
  side: Side;
  lineups: Lineup[];
  busy: string | null;
  onPoke: (side: Side) => void;
}) {
  const lineup = sideLineup(match, lineups, side);
  const lineupSent = lineup?.lineup_status === "Enviada";
  const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
  const abbr =
    (side === "a" ? match.team_a_abbreviation : match.team_b_abbreviation) ||
    sideTeamName(match, side);

  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">
          {flag} <span className="font-mono text-xs font-bold text-branco-quente">{abbr}</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Chip ok={lineupSent} label="Esc." />
      </div>
      <div className="flex items-center gap-1">
        {!lineupSent && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={(e) => {
              e.stopPropagation();
              onPoke(side);
            }}
            className="rounded-md border border-coral/40 px-2 py-1 text-[10px] font-bold text-coral transition active:scale-95"
          >
            {busy === `poke-${side}` ? "…" : "📣 Cobrar"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MatchReadinessCard({
  match,
  courts,
  lineups,
  results,
  selected,
  onOpen,
  onEnsureOpen,
  onChanged,
}: MatchReadinessCardProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [poked, setPoked] = useState<Side[]>([]);
  const [courtError, setCourtError] = useState<string | null>(null);
  const mix = mixedState(match, results);
  const status = match.match_status;
  const courtOptions = courts
    .map((court) => `Q${court.court_number}`)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const selectedCourt = match.court ?? "";
  const hasStoredCourt = selectedCourt && !courtOptions.includes(selectedCourt);
  const bothLineupsSent =
    sideLineup(match, lineups, "a")?.lineup_status === "Enviada" &&
    sideLineup(match, lineups, "b")?.lineup_status === "Enviada";

  async function poke(side: Side) {
    setBusy(`poke-${side}`);
    await pokeCaptain(match, side);
    setBusy(null);
    setPoked((prev) => [...prev, side]);
  }

  async function start() {
    setBusy("start");
    await startMatch(match);
    setBusy(null);
    onChanged();
  }

  async function changeCourt(court: string) {
    setBusy("court");
    setCourtError(null);
    const nextCourt = court || null;
    const shouldRelease =
      !!nextCourt &&
      bothLineupsSent &&
      ["Escalações recebidas", "Aguardando presença", "Pronto para quadra"].includes(match.match_status);
    const error = await updateMatchAdmin(match, {
      court: nextCourt,
      ...(shouldRelease ? { match_status: "Liberado para quadra" as const } : {}),
    });
    setBusy(null);
    if (error) {
      setCourtError(error);
      return;
    }
    onChanged();
  }

  const primary: { label: string; onClick: () => void } | null = (() => {
    switch (status) {
      case "Pronto para quadra":
        return { label: "🚩 Liberar quadra", onClick: onEnsureOpen };
      case "Liberado para quadra":
        return { label: busy === "start" ? "…" : "▶ Iniciar confronto", onClick: start };
      case "Em andamento":
      case "Resultado pendente":
        return { label: "🏆 Lançar resultado", onClick: onEnsureOpen };
      case "Resultado contestado":
        return { label: "⚠ Resolver contestação", onClick: onEnsureOpen };
      case "Finalizado":
      case "W.O.":
      case "Desistência":
        return null;
      default:
        return { label: "👁 Ver detalhes", onClick: onEnsureOpen };
    }
  })();

  return (
    <div
      onClick={onOpen}
      className={`animate-fade-in-up cursor-pointer space-y-3 rounded-3xl border bg-white/[0.05] p-4 backdrop-blur transition active:scale-[0.99] ${
        selected ? "border-coral/70 bg-coral/10" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cream/50">
          {[
            match.category_name && `Cat. ${match.category_name}`,
            match.group_or_phase,
            match.round,
            match.court,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
        <StatusPill status={status} />
      </div>

      <label
        className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
          Quadra
        </span>
        <select
          value={selectedCourt}
          disabled={busy !== null}
          onChange={(e) => changeCourt(e.target.value)}
          className="min-w-0 rounded-xl border border-coral/40 bg-roxo-escuro px-3 py-2 text-sm font-extrabold text-branco-quente outline-none transition focus:border-coral"
        >
          <option value="">Definir</option>
          {hasStoredCourt && <option value={selectedCourt}>{selectedCourt}</option>}
          {courtOptions.map((court) => (
            <option key={court} value={court}>
              {court}
            </option>
          ))}
        </select>
      </label>
      {courtError && <p className="text-[10px] font-bold text-coral">{courtError}</p>}

      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-base font-extrabold text-branco-quente">
          {match.team_a_flag} {match.team_a_abbreviation || match.team_a_name}
        </span>
        <span className="font-display text-2xl tabular-nums text-branco-quente">
          {match.score_team_a}
          <span className="mx-1 text-cream/40">×</span>
          {match.score_team_b}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-base font-extrabold text-branco-quente">
          {match.team_b_abbreviation || match.team_b_name} {match.team_b_flag}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["a", "b"] as const).map((side) => (
          <SideStatus
            key={side}
            match={match}
            side={side}
            lineups={lineups}
            busy={busy}
            onPoke={poke}
          />
        ))}
      </div>

      {poked.length > 0 && (
        <p className="text-[10px] font-bold text-emerald-300">
          Cobrança enviada{poked.length > 1 ? "s" : ""}.
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] font-bold">
        <span
          className={
            mix === "necessaria"
              ? "text-orange-300"
              : mix === "jogada"
                ? "text-emerald-300"
                : "text-cream/40"
          }
        >
          {MIXED_LABEL[mix]}
        </span>
        <span className={`font-mono uppercase tracking-wider text-[11px] ${selected ? "text-coral" : "text-cream/50"}`}>
          {selected ? "Aberto ▴" : "Ver detalhes →"}
        </span>
      </div>

      {primary && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={(e) => {
            e.stopPropagation();
            primary.onClick();
          }}
          className="w-full rounded-xl bg-coral px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-branco-quente transition active:scale-[0.98]"
        >
          {primary.label}
        </button>
      )}
    </div>
  );
}
