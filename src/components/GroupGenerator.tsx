// ============================================================================
// GroupGenerator — geração de chaves (Org → CONF).
// Seleciona categoria + equipes, distribui em grupos por serpentina e gera o
// round-robin de cada grupo direto na tabela matches.
// ============================================================================
import { useMemo, useState } from "react";
import Button from "./Button";
import { FormSelect } from "./FormInput";
import { insertGeneratedMatches } from "../lib/actions";
import { distributeGroups, roundRobin } from "../lib/engine";
import type { Category, Match, Team } from "../lib/types";

interface GroupGeneratorProps {
  categories: Category[];
  teams: Team[];
  matches: Match[];
  onGenerated: () => void;
}

export default function GroupGenerator({ categories, teams, matches, onGenerated }: GroupGeneratorProps) {
  const [categoryId, setCategoryId] = useState("");
  const [groupCount, setGroupCount] = useState(2);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const existingCount = useMemo(
    () => (category ? matches.filter((m) => m.category_name === category.category_name).length : 0),
    [matches, category],
  );

  function toggleTeam(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
    setDone(null);
  }

  const picked = teams.filter((t) => selected.includes(t.id));
  const groups = useMemo(() => distributeGroups(picked, groupCount), [picked, groupCount]);
  const totalMatches = groups.reduce((acc, g) => acc + (g.length * (g.length - 1)) / 2, 0);

  async function generate() {
    if (!category || totalMatches === 0) return;
    setBusy(true);
    setError(null);
    const rows: Array<Record<string, unknown>> = [];
    groups.forEach((groupTeams, gi) => {
      const groupName = `Grupo ${gi + 1}`;
      roundRobin(groupTeams).forEach((pairs, ri) => {
        pairs.forEach(([a, b]) => {
          rows.push({
            category_id: category.id,
            category_name: category.category_name,
            group_or_phase: groupName,
            round: `Rodada ${ri + 1}`,
            team_a_id: a.id,
            team_a_name: a.team_name,
            team_a_abbreviation: a.abbreviation,
            team_a_flag: a.flag,
            team_b_id: b.id,
            team_b_name: b.team_name,
            team_b_abbreviation: b.abbreviation,
            team_b_flag: b.flag,
            match_status: "Aguardando escalação",
            match_mode: "Sequencial",
          });
        });
      });
    });
    const err = await insertGeneratedMatches(rows, category.category_name);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(`${rows.length} confrontos gerados na categoria ${category.category_name}.`);
    setSelected([]);
    onGenerated();
  }

  return (
    <div className="animate-fade-in-up space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-sm font-extrabold uppercase tracking-wide text-coral">Gerar chaves</p>

      <FormSelect label="Categoria" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setDone(null); }}>
        <option value="">Selecione…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.category_name}</option>
        ))}
      </FormSelect>

      {category && existingCount > 0 && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300">
          ⚠ A categoria {category.category_name} já tem {existingCount} confrontos. Gerar de novo NÃO apaga os existentes.
        </p>
      )}

      <FormSelect label="Número de grupos" value={String(groupCount)} onChange={(e) => setGroupCount(Number(e.target.value))}>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>{n} {n === 1 ? "grupo" : "grupos"}</option>
        ))}
      </FormSelect>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-cream/60">
          Equipes ({selected.length} selecionadas)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {teams.map((t) => {
            const active = selected.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTeam(t.id)}
                className={`truncate rounded-xl border px-2 py-2 text-xs font-extrabold transition ${
                  active ? "border-coral bg-coral text-branco-quente" : "border-white/15 bg-white/5 text-cream/80"
                }`}
              >
                {t.flag} {t.abbreviation || t.team_name}
              </button>
            );
          })}
        </div>
      </div>

      {picked.length > 1 && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
            Prévia — distribuição em serpentina · {totalMatches} confrontos
          </p>
          {groups.map((g, i) => (
            <p key={i} className="text-sm font-semibold text-cream/80">
              <span className="font-extrabold text-branco-quente">Grupo {i + 1}:</span>{" "}
              {g.map((t) => t.abbreviation || t.team_name).join(", ")}
            </p>
          ))}
        </div>
      )}

      {error && <p className="text-sm font-bold text-coral">{error}</p>}
      {done && (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-300">
          {done}
        </p>
      )}

      <Button full disabled={busy || !category || totalMatches === 0} onClick={generate}>
        {busy ? "Gerando…" : `Gerar ${totalMatches > 0 ? `${totalMatches} confrontos` : "chaves"}`}
      </Button>
    </div>
  );
}
