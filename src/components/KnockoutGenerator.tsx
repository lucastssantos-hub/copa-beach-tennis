// Eliminatórias — geração a partir da classificação dos grupos e avanço da chave.
import { useMemo, useState } from "react";
import Button from "./Button";
import { FormSelect } from "./FormInput";
import { insertGeneratedMatches } from "../lib/actions";
import { buildNextKnockoutPlan } from "../lib/engine";
import type { Category, Match, Result } from "../lib/types";

interface KnockoutGeneratorProps {
  categories: Category[];
  matches: Match[];
  results: Result[];
  onGenerated: () => void;
}

export default function KnockoutGenerator({ categories, matches, results, onGenerated }: KnockoutGeneratorProps) {
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const plan = useMemo(
    () => (category ? buildNextKnockoutPlan(category.category_name, matches, results) : null),
    [category, matches, results],
  );

  async function generate() {
    if (!category || !plan || plan.rows.length === 0) return;
    setBusy(true);
    setError(null);
    const rows = plan.rows.map((row) => ({
      category_id: category.id,
      category_name: category.category_name,
      group_or_phase: row.phase,
      round: row.round,
      team_a_id: row.teamA.id,
      team_a_name: row.teamA.name,
      team_a_abbreviation: row.teamA.abbreviation,
      team_a_flag: row.teamA.flag,
      team_b_id: row.teamB.id,
      team_b_name: row.teamB.name,
      team_b_abbreviation: row.teamB.abbreviation,
      team_b_flag: row.teamB.flag,
      match_status: "Aguardando escalação",
      match_mode: "Sequencial",
    }));
    const err = await insertGeneratedMatches(rows, category.category_name, "ORG:ELIMINATORIAS");
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(`${rows.length} confronto${rows.length === 1 ? "" : "s"} de ${plan.label.toLowerCase()} criado${rows.length === 1 ? "" : "s"}.`);
    onGenerated();
  }

  return (
    <div className="animate-fade-in-up space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-sm font-extrabold uppercase tracking-wide text-coral">Gerar eliminatórias</p>

      <FormSelect label="Categoria" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setDone(null); }}>
        <option value="">Selecione…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.category_name}</option>
        ))}
      </FormSelect>

      {plan && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
            Prévia — {plan.label}
          </p>
          {plan.reason ? (
            <p className="text-sm font-bold text-amber-300">{plan.reason}</p>
          ) : (
            plan.rows.map((row) => (
              <div key={`${row.phase}-${row.round}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-cream/50">
                  {row.phase} · {row.round}
                </p>
                <p className="mt-1 text-sm font-extrabold text-branco-quente">
                  {row.teamA.flag} {row.teamA.abbreviation || row.teamA.name}
                  <span className="px-2 text-cream/40">×</span>
                  {row.teamB.flag} {row.teamB.abbreviation || row.teamB.name}
                </p>
                {(row.teamA.seedLabel || row.teamB.seedLabel) && (
                  <p className="mt-1 text-[11px] font-bold text-cream/50">
                    {[row.teamA.seedLabel, row.teamB.seedLabel].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {error && <p className="text-sm font-bold text-coral">{error}</p>}
      {done && (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-300">
          {done}
        </p>
      )}

      <Button full disabled={busy || !category || !plan || plan.rows.length === 0} onClick={generate}>
        {busy ? "Gerando…" : "Gerar próxima fase"}
      </Button>
    </div>
  );
}
