const SEED_ROWS = [
  ["1º classificado", "2º classificado"],
  ["3º classificado", "4º classificado"],
  ["5º classificado", "6º classificado"],
  ["7º classificado", "8º classificado"],
];

function MatchSlot({ title, left, right }: { title: string; left: string; right: string }) {
  return (
    <div className="min-w-[190px] rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-coral">{title}</p>
      <div className="mt-2 space-y-1.5">
        <div className="rounded-xl border border-white/10 bg-roxo-escuro/60 px-3 py-2 text-xs font-extrabold text-branco-quente">
          {left}
        </div>
        <div className="rounded-xl border border-white/10 bg-roxo-escuro/60 px-3 py-2 text-xs font-extrabold text-branco-quente">
          {right}
        </div>
      </div>
    </div>
  );
}

export default function KnockoutBracketPreview({ categoryName }: { categoryName: string | null }) {
  if (categoryName !== "60+") return null;

  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-cream/50">Fase classificatória</p>
        <h2 className="mt-1 text-lg font-extrabold text-branco-quente">Chave 60+</h2>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-3 px-1">
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">QF</p>
            {SEED_ROWS.map(([left, right], index) => (
              <MatchSlot key={left} title={`Quartas ${index + 1}`} left={left} right={right} />
            ))}
          </div>
          <div className="space-y-2 pt-8">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">SF</p>
            <MatchSlot title="Semifinal 1" left="Venc. Quartas 1" right="Venc. Quartas 2" />
            <div className="h-16" />
            <MatchSlot title="Semifinal 2" left="Venc. Quartas 3" right="Venc. Quartas 4" />
          </div>
          <div className="space-y-2 pt-24">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-cream/50">Final</p>
            <MatchSlot title="Final" left="Venc. Semifinal 1" right="Venc. Semifinal 2" />
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-extrabold text-amber-200">
              Campeão
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
