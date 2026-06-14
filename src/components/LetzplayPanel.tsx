// ============================================================================
// LetzplayPanel — transferência das escalações para o LetzPlay (digitação manual).
// As chaves rodam no LetzPlay; aqui o operador vê os confrontos cujas DUAS
// escalações já foram enviadas, com as 3 duplas no formato de digitação, copia
// e marca como enviado. Pensado para uso no celular/tablet durante o evento.
// ============================================================================
import { useMemo, useState } from "react";
import Button from "./Button";
import EmptyState from "./EmptyState";
import { setLetzplaySynced } from "../lib/actions";
import {
  buildLetzplayMatch,
  letzplayClipboardText,
  sideTeamName,
  type LetzplayMatch,
  type LineupTriple,
  type Pair,
} from "../lib/engine";
import type { Lineup, Match } from "../lib/types";

type Filter = "pronto" | "aguardando" | "enviado";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pronto", label: "Prontos" },
  { id: "aguardando", label: "Aguardando" },
  { id: "enviado", label: "Enviados" },
];

function GameLine({
  label,
  a,
  b,
  nameA,
  nameB,
  flagA,
  flagB,
  conditional,
}: {
  label: string;
  a: Pair | null;
  b: Pair | null;
  nameA: string;
  nameB: string;
  flagA: string | null;
  flagB: string | null;
  conditional?: boolean;
}) {
  if (!a && !b) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-cream/50">
        {label}
        {conditional && <span className="ml-1 text-amber-300/80">· só se 1×1</span>}
      </p>
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2 font-semibold text-branco-quente">
          <span>{flagA || "🏳️"}</span>
          <span className="font-mono text-[11px] text-cream/50">{nameA}</span>
          <span className="font-bold">{a ? `${a.p1} / ${a.p2}` : "—"}</span>
        </p>
        <p className="flex items-center gap-2 font-semibold text-branco-quente">
          <span>{flagB || "🏳️"}</span>
          <span className="font-mono text-[11px] text-cream/50">{nameB}</span>
          <span className="font-bold">{b ? `${b.p1} / ${b.p2}` : "—"}</span>
        </p>
      </div>
    </div>
  );
}

function triples(lm: LetzplayMatch): { a: LineupTriple | null; b: LineupTriple | null } {
  return { a: lm.a, b: lm.b };
}

function LetzplayCard({ lm, onChanged }: { lm: LetzplayMatch; onChanged: () => void }) {
  const m = lm.match;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { a, b } = triples(lm);
  const nameA = sideTeamName(m, "a");
  const nameB = sideTeamName(m, "b");

  async function copy() {
    try {
      await navigator.clipboard.writeText(letzplayClipboardText(lm));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard pode falhar fora de https — o operador ainda lê na tela */
    }
  }

  async function toggle(synced: boolean) {
    setBusy(true);
    await setLetzplaySynced(m, synced);
    setBusy(false);
    onChanged();
  }

  return (
    <div className="animate-fade-in-up space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-branco-quente">
          {m.team_a_flag} {m.team_a_abbreviation || nameA} <span className="text-cream/40">×</span>{" "}
          {m.team_b_abbreviation || nameB} {m.team_b_flag}
        </p>
        {m.scheduled_time && (
          <span className="font-mono text-xs font-bold text-cream/60">{m.scheduled_time}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cream/60">
        {m.category_name && <span className="rounded-full bg-roxo/60 px-2.5 py-1 text-cream">Cat. {m.category_name}</span>}
        {m.group_or_phase && <span className="rounded-full bg-white/8 px-2.5 py-1">{m.group_or_phase}</span>}
      </div>

      {lm.stage === "aguardando" ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs font-bold text-amber-300">
          ⏳ Falta a escalação de{" "}
          {lm.pendingSides.map((s) => sideTeamName(m, s)).join(" e ")} — cobrar o capitão.
        </p>
      ) : (
        <div className="space-y-2">
          <GameLine label="Feminino" a={a?.feminina ?? null} b={b?.feminina ?? null} nameA={nameA} nameB={nameB} flagA={m.team_a_flag} flagB={m.team_b_flag} />
          <GameLine label="Masculino" a={a?.masculina ?? null} b={b?.masculina ?? null} nameA={nameA} nameB={nameB} flagA={m.team_a_flag} flagB={m.team_b_flag} />
          <GameLine label="Mista" a={a?.mista ?? null} b={b?.mista ?? null} nameA={nameA} nameB={nameB} flagA={m.team_a_flag} flagB={m.team_b_flag} conditional />
        </div>
      )}

      {lm.stage === "pronto" && (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 !py-2.5 !text-xs" onClick={copy}>
            {copied ? "✓ Copiado" : "Copiar"}
          </Button>
          <Button className="flex-1 !py-2.5 !text-xs" disabled={busy} onClick={() => toggle(true)}>
            {busy ? "…" : "✓ Enviado ao LetzPlay"}
          </Button>
        </div>
      )}
      {lm.stage === "enviado" && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
            ✓ No LetzPlay
          </span>
          <button
            className="text-[11px] font-bold uppercase tracking-wide text-cream/50"
            disabled={busy}
            onClick={() => toggle(false)}
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}

export default function LetzplayPanel({
  matches,
  lineups,
  selectedCategories,
  onChanged,
}: {
  matches: Match[];
  lineups: Lineup[];
  selectedCategories: string[];
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("pronto");

  const all = useMemo(() => {
    return matches
      .filter((m) =>
        selectedCategories.length === 0 ||
        (m.category_name !== null && selectedCategories.includes(m.category_name)),
      )
      // Só confrontos onde já chegou ao menos uma escalação (ignora os 100% vazios).
      .map((m) => buildLetzplayMatch(m, lineups))
      .filter((lm) => lm.a !== null || lm.b !== null);
  }, [matches, lineups, selectedCategories]);

  const counts = {
    pronto: all.filter((lm) => lm.stage === "pronto").length,
    aguardando: all.filter((lm) => lm.stage === "aguardando").length,
    enviado: all.filter((lm) => lm.stage === "enviado").length,
  };

  const list = all.filter((lm) => lm.stage === filter);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-branco-quente">Transferir para o LetzPlay</h2>
        <p className="text-xs font-semibold text-cream/50">
          Confrontos com as duas escalações enviadas. Digite as duplas no LetzPlay e marque como enviado.
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
              filter === f.id
                ? "border-coral bg-coral text-branco-quente"
                : "border-white/15 bg-white/5 text-cream/70"
            }`}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="📋"
          title={
            filter === "pronto"
              ? "Nada pronto para transferir"
              : filter === "aguardando"
                ? "Nenhum confronto aguardando"
                : "Nada enviado ainda"
          }
          message={
            filter === "pronto"
              ? "Aparecem aqui os confrontos com as duas escalações enviadas."
              : filter === "aguardando"
                ? "Confrontos com só um lado escalado aparecem aqui para cobrança."
                : "Os confrontos já digitados no LetzPlay ficam aqui."
          }
        />
      ) : (
        list.map((lm) => <LetzplayCard key={lm.match.id} lm={lm} onChanged={onChanged} />)
      )}
    </section>
  );
}
