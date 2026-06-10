const STATUS_COLORS: Record<string, string> = {
  // matches — tons do formato Lovable: vermelho/amarelo/azul/verde/roxo/laranja/cinza
  "Aguardando escalação": "bg-coral/15 text-coral border-coral/30",
  "Escalação parcial": "bg-amber-400/15 text-amber-300 border-amber-400/30",
  "Escalações recebidas": "bg-sky-400/15 text-sky-300 border-sky-400/30",
  "Aguardando presença": "bg-amber-400/15 text-amber-300 border-amber-400/30",
  "Pronto para quadra": "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  "Liberado para quadra": "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
  "Em andamento": "bg-violet-400/20 text-violet-300 border-violet-400/40",
  "Resultado pendente": "bg-orange-400/15 text-orange-300 border-orange-400/30",
  Finalizado: "bg-white/8 text-cream/60 border-white/10",
  "Resultado contestado": "bg-rose-400/15 text-rose-300 border-rose-400/30",
  "W.O.": "bg-rose-400/15 text-rose-300 border-rose-400/30",
  Desistência: "bg-rose-400/15 text-rose-300 border-rose-400/30",
  // courts
  Livre: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  Escape: "bg-violet-400/15 text-violet-300 border-violet-400/30",
  Ocupada: "bg-coral/20 text-coral border-coral/40",
  // lineups / results
  Pendente: "bg-white/10 text-cream/80 border-white/15",
  Rascunho: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  Enviada: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
};

export default function StatusPill({ status, live = false }: { status: string; live?: boolean }) {
  const color = STATUS_COLORS[status] ?? "bg-white/10 text-cream/80 border-white/15";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${color}`}
    >
      {(live || status === "Em andamento") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-live" />
      )}
      {status}
    </span>
  );
}
