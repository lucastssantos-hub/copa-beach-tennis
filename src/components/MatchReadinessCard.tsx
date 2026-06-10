// ============================================================================
// MatchReadinessCard — cartão operacional de prontidão (formato Lovable).
// Mostra num relance: status, placar, escalação/presença por equipe (com ações
// inline de confirmar presença e cobrar capitão), estado da mista e a ação
// principal contextual do confronto.
// ============================================================================
import { useState } from "react";
import StatusPill from "./StatusPill";
import {
  MIXED_LABEL,
  mixedState,
  sideLineup,
  sidePresence,
  sideTeamName,
} from "../lib/engine";
import { confirmPresenceAndAdvance, pokeCaptain, startMatch } from "../lib/actions";
import type { Lineup, Match, Presence, Result } from "../lib/types";

type Side = "a" | "b";

interface MatchReadinessCardProps {
  match: Match;
  lineups: Lineup[];
  presence: Presence[];
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
  presence,
  busy,
  onConfirm,
  onPoke,
}: {
  match: Match;
  side: Side;
  lineups: Lineup[];
  presence: Presence[];
  busy: string | null;
  onConfirm: (side: Side) => void;
  onPoke: (side: Side) => void;
}) {
  const lineup = sideLineup(match, lineups, side);
  const lineupSent = lineup?.lineup_status === "Enviada";
  const p = sidePresence(match, presence, side);
  const flag = side === "a" ? match.team_a_flag : match.team_b_flag;
  const abbr =
    (side === "a" ? match.team_a_abbreviation : match.team_b_abbreviation) ||
    sideTeamName(match, side);
  const confirmed = !!p?.admin_confirmed;

  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">
          {flag} <span className="font-mono text-xs font-bold text-branco-quente">{abbr}</span>
        </span>
        {p?.captain_ready && !confirmed && (
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300" title="Capitão avisou: pronto na arena">
            ● Ready
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Chip ok={lineupSent} label="Esc." />
        <Chip ok={confirmed} label="Pres." />
      </div>
      <div className="flex items-center gap-1">
        {!confirmed && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(side);
            }}
            className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-bold text-cream/80 transition active:scale-95"
          >
            {busy === `pres-${side}` ? "…" : "Confirmar"}
          </button>
        )}
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
  lineups,
  presence,
  results,
  selected,
  onOpen,
  onEnsureOpen,
  onChanged,
}: MatchReadinessCardProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [poked, setPoked] = useState<Side[]>([]);
  const mix = mixedState(match, results);
  const status = match.match_status;

  async function confirm(side: Side) {
    setBusy(`pres-${side}`);
    const other = sidePresence(match, presence, side === "a" ? "b" : "a");
    await confirmPresenceAndAdvance(match, side, !!other?.admin_confirmed);
    setBusy(null);
    onChanged();
  }

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
            presence={presence}
            busy={busy}
            onConfirm={confirm}
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
        <span className="font-mono uppercase tracking-wider text-cream/50">
          {selected ? "Fechar ▴" : "Abrir ▸"}
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
