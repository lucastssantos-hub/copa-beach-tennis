interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export default function EmptyState({ icon = "🏖️", title, message }: EmptyStateProps) {
  return (
    <div className="animate-fade-in-up rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <p className="text-base font-extrabold text-branco-quente">{title}</p>
      {message && <p className="mt-1.5 text-sm font-medium text-cream/60">{message}</p>}
    </div>
  );
}
