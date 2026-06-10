import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const fieldClass =
  "w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-base font-semibold text-branco-quente placeholder:text-cream/40 outline-none focus:border-coral/70 focus:bg-white/10 transition";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function FormInput({ label, ...props }: FormInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-cream/60">
        {label}
      </span>
      <input {...props} className={fieldClass} />
    </label>
  );
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function FormSelect({ label, children, ...props }: FormSelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-cream/60">
        {label}
      </span>
      <select {...props} className={`${fieldClass} appearance-none [&>option]:bg-roxo-escuro`}>
        {children}
      </select>
    </label>
  );
}
