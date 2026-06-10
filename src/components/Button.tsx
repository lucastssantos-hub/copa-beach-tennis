import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-coral text-branco-quente shadow-[0_8px_24px_rgba(255,90,78,0.35)] active:scale-[0.98]",
  secondary:
    "bg-white/10 text-branco-quente border border-white/15 active:scale-[0.98]",
  ghost: "bg-transparent text-cream/80 border border-white/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export default function Button({
  variant = "primary",
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-2xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wide transition disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
    />
  );
}
