export interface BottomNavItem {
  id: string;
  label: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function BottomNav({ items, active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-roxo-escuro/90 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex-1 rounded-xl px-1 py-2.5 text-[11px] font-extrabold uppercase tracking-wide transition ${
                isActive ? "bg-coral/15 text-coral" : "text-cream/50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
