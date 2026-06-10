import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { supabaseConfigured } from "../lib/supabase";

const links = [
  {
    to: "/org",
    icon: "🛠️",
    title: "Organização",
    desc: "Confrontos, quadras, notificações e auditoria",
  },
  {
    to: "/capitao",
    icon: "🧢",
    title: "Capitão",
    desc: "Escalações e presença da sua equipe",
  },
  {
    to: "/telao",
    icon: "📺",
    title: "Telão",
    desc: "Quadras ao vivo, jogos e resultados",
  },
];

export default function Home() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.3em] text-coral">
            Edição 2026
          </p>
          <h1 className="font-display text-4xl uppercase leading-[1.05] text-branco-quente">
            Copa do Mundo
            <br />
            de Beach Tennis
          </h1>
          <p className="mt-3 text-sm font-semibold text-cream/60">
            Torneio por equipes · ao vivo na arena
          </p>
        </div>

        <div className="space-y-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur transition active:scale-[0.99]"
            >
              <span className="text-3xl">{l.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold text-branco-quente">{l.title}</span>
                <span className="block text-xs font-semibold text-cream/60">{l.desc}</span>
              </span>
              <span className="text-coral">→</span>
            </Link>
          ))}
        </div>

        {!supabaseConfigured && (
          <p className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center text-xs font-bold text-amber-300">
            Supabase ainda não configurado — preencha o arquivo .env (veja o README).
          </p>
        )}
      </div>
    </AppShell>
  );
}
