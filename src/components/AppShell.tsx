import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  /** Reserva espaço para a BottomNav fixa. */
  withBottomNav?: boolean;
}

export default function AppShell({ children, withBottomNav = false }: AppShellProps) {
  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-lg flex-col ${withBottomNav ? "pb-24" : "pb-8"}`}
    >
      {children}
    </div>
  );
}
