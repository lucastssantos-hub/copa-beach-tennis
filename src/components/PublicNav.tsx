import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Início", icon: "⌂", end: true },
  { to: "/inscritos", label: "Inscritos", icon: "●", end: false },
  { to: "/telao", label: "Ao vivo", icon: "◉", end: false },
];

export default function PublicNav() {
  return (
    <nav aria-label="Navegação pública" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-roxo-escuro/95 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-lg items-stretch px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl px-2 text-[11px] font-extrabold uppercase tracking-wide transition ${
              isActive ? "bg-coral/15 text-coral" : "text-cream/60"
            }`}
          >
            <span aria-hidden="true" className="text-base leading-none">{item.icon}</span>
            <span className="mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
