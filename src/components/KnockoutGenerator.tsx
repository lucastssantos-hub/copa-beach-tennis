// Eliminatórias — geração a partir da classificação dos grupos e avanço da chave.
// Suporta chave "adiantada": os grupos já fechados entram com as equipes reais
// (o capitão escala desde já) e os grupos em andamento viram vaga em aberto,
// preenchida depois pelo botão "Preencher vagas definidas".
import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import { FormSelect } from "./FormInput";
import { applyKnockoutFill, insertGeneratedMatches } from "../lib/actions";
import { buildKnockoutFillPlan, buildNextKnockoutPlan } from "../lib/engine";
import type { Category, Match, Result } from "../lib/types";

interface KnockoutGeneratorProps {
  categories: Category[];
  matches: Match[];
  results: Result[];
  onGenerated: () => void;
}

function SlotLabel({ slot }: { slot: { name: string; abbreviation: string | null; flag: string | null; pending?: boolean } }) {
  if (slot.pending) {
    return <span className="text-amber-300">{slot.abbreviation || slot.name}</span>;
  }
  return (
    <span>
      {slot.flag} {slot.abbreviation || slot.name}
    </span>
  );
}

export default function KnockoutGenerator({ categories, matches, results, onGenerated }: KnockoutGeneratorProps) {
  const [categoryId, setCategoryId] = useState("");
  const [allowPartial, setAllowPartial] = useState(false);
  // A chave desta Copa no LetzPlay é SF → Final → Campeão. O 3º lugar só entra
  // se a organização marcar — senão o app criaria um confronto inexistente lá.
  const [thirdPlace, setThirdPlace] = useState(false);
  const [busy, setBusy] = useState<"gerar" | "preencher" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const categoryName = category?.category_name ?? null;

  const strictPlan = useMemo(
    () => (categoryName ? buildNextKnockoutPlan(categoryName, matches, results, { thirdPlace }) : null),
    [categoryName, matches, results, thirdPlace],
  );
  const partialPlan = useMemo(
    () =>
      categoryName
        ? buildNextKnockoutPlan(categoryName, matches, results, { allowPartial: true, thirdPlace })
        : null,
    [categoryName, matches, results, thirdPlace],
  );
  const fillPlan = useMemo(
    () => (categoryName ? buildKnockoutFillPlan(categoryName, matches, results) : null),
    [categoryName, matches, results],
  );

  // A chave adiantada só é oferecida quando a normal está travada por grupo aberto.
  const partialAvailable = !!(
    strictPlan &&
    partialPlan &&
    strictPlan.rows.length === 0 &&
    partialPlan.rows.length > 0
  );
  const plan = partialAvailable && allowPartial ? partialPlan : strictPlan;

  useEffect(() => {
    if (!partialAvailable) setAllowPartial(false);
  }, [partialAvailable]);

  async function generate() {
    if (!category || !plan || plan.rows.length === 0) return;
    setBusy("gerar");
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
    setBusy(null);
    if (err) {
      setError(err);
      return;
    }
    const open = plan.rows.reduce((n, r) => n + (r.teamA.pending ? 1 : 0) + (r.teamB.pending ? 1 : 0), 0);
    setDone(
      `${rows.length} confronto${rows.length === 1 ? "" : "s"} de ${plan.label.toLowerCase()} criado${rows.length === 1 ? "" : "s"}` +
        (open > 0 ? ` — ${open} vaga${open === 1 ? "" : "s"} em aberto.` : "."),
    );
    onGenerated();
  }

  async function fill() {
    if (!category || !fillPlan || fillPlan.rows.length === 0) return;
    setBusy("preencher");
    setError(null);
    const err = await applyKnockoutFill(fillPlan.rows, category.category_name);
    setBusy(null);
    if (err) {
      setError(err);
      return;
    }
    setDone(`${fillPlan.rows.length} vaga${fillPlan.rows.length === 1 ? "" : "s"} preenchida${fillPlan.rows.length === 1 ? "" : "s"}.`);
    onGenerated();
  }

  return (
    <div className="animate-fade-in-up space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-sm font-extrabold uppercase tracking-wide text-coral">Gerar eliminatórias</p>

      <FormSelect
        label="Categoria"
        value={categoryId}
        onChange={(e) => {
          setCategoryId(e.target.value);
          setDone(null);
          setError(null);
        }}
      >
        <option value="">Selecione…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.category_name}</option>
        ))}
      </FormSelect>

      {/* Vagas em aberto de uma chave já criada — aparece assim que o grupo fecha */}
      {fillPlan && (fillPlan.rows.length > 0 || fillPlan.waiting.length > 0) && (
        <div className="space-y-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
            Vagas em aberto na chave
          </p>
          {fillPlan.rows.map((row) => (
            <p key={`${row.match.id}-${row.side}`} className="text-sm font-extrabold text-branco-quente">
              <span className="text-amber-300">{row.seedLabel}</span>
              <span className="px-2 text-cream/40">→</span>
              {row.slot.flag} {row.slot.abbreviation || row.slot.name}
              <span className="ml-2 text-[11px] font-bold text-cream/50">
                {row.match.round ?? row.match.group_or_phase}
              </span>
            </p>
          ))}
          {fillPlan.waiting.length > 0 && (
            <p className="text-xs font-bold text-cream/60">
              Ainda indefinidas: {fillPlan.waiting.join(", ")} — falta o confronto de origem ser
              finalizado no app. Dá para definir à mão em CLASS, tocando no confronto da chave.
            </p>
          )}
          {fillPlan.rows.length > 0 && (
            <Button full disabled={busy !== null} onClick={fill}>
              {busy === "preencher" ? "Preenchendo…" : "Preencher vagas definidas"}
            </Button>
          )}
        </div>
      )}

      <label className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <input
          type="checkbox"
          checked={thirdPlace}
          onChange={(e) => {
            setThirdPlace(e.target.checked);
            setDone(null);
          }}
          className="mt-0.5 h-4 w-4 accent-coral"
        />
        <span className="text-xs font-bold text-cream/80">
          Criar disputa de 3º lugar
          <span className="mt-0.5 block font-normal text-cream/55">
            A chave do LetzPlay é SF → Final → Campeão. Marque só se a Copa for jogar o 3º lugar.
          </span>
        </span>
      </label>

      {partialAvailable && (
        <label className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <input
            type="checkbox"
            checked={allowPartial}
            onChange={(e) => {
              setAllowPartial(e.target.checked);
              setDone(null);
            }}
            className="mt-0.5 h-4 w-4 accent-coral"
          />
          <span className="text-xs font-bold text-cream/80">
            Adiantar com os grupos já fechados
            <span className="mt-0.5 block font-normal text-cream/55">
              Os classificados definidos já entram na chave e podem escalar; o restante fica como vaga em aberto.
            </span>
          </span>
        </label>
      )}

      {plan && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
            Prévia — {plan.label}
          </p>
          {plan.reason ? (
            <p className="text-sm font-bold text-amber-300">{plan.reason}</p>
          ) : (
            <>
              {plan.note && <p className="text-xs font-bold text-amber-300">{plan.note}</p>}
              {plan.rows.map((row) => (
                <div key={`${row.phase}-${row.round}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-cream/50">
                    {row.phase} · {row.round}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-branco-quente">
                    <SlotLabel slot={row.teamA} />
                    <span className="px-2 text-cream/40">×</span>
                    <SlotLabel slot={row.teamB} />
                  </p>
                  {(row.teamA.seedLabel || row.teamB.seedLabel) && (
                    <p className="mt-1 text-[11px] font-bold text-cream/50">
                      {[row.teamA.seedLabel, row.teamB.seedLabel].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm font-bold text-coral">{error}</p>}
      {done && (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-300">
          {done}
        </p>
      )}

      <Button full disabled={busy !== null || !category || !plan || plan.rows.length === 0} onClick={generate}>
        {busy === "gerar" ? "Gerando…" : plan?.partial ? "Gerar chave com vagas em aberto" : "Gerar próxima fase"}
      </Button>
    </div>
  );
}
