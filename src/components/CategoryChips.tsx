interface CategoryChipsProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1">
      {categories.map((cat) => {
        const active = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(active ? null : cat)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
              active
                ? "border-coral bg-coral text-branco-quente shadow-[0_4px_16px_rgba(255,90,78,0.4)]"
                : "border-white/15 bg-white/5 text-cream/80"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
