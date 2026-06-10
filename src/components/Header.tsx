import { Link } from "react-router-dom";

interface HeaderProps {
  title: string;
  kicker?: string;
  backTo?: string;
}

export default function Header({
  title,
  kicker = "Copa do Mundo de Beach Tennis",
  backTo,
}: HeaderProps) {
  return (
    <header className="px-5 pt-6 pb-4">
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-cream/60"
        >
          ← Voltar
        </Link>
      )}
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">
        {kicker}
      </p>
      <h1 className="font-display text-3xl uppercase leading-tight text-branco-quente">
        {title}
      </h1>
    </header>
  );
}
