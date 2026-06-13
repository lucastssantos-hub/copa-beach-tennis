import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  /** Reserva espaço para a BottomNav fixa. */
  withBottomNav?: boolean;
  width?: "narrow" | "wide";
}

export default function AppShell({ children, withBottomNav = false, width = "narrow" }: AppShellProps) {
  const maxWidth = width === "wide" ? "max-w-7xl" : "max-w-lg";

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full ${maxWidth} flex-col ${withBottomNav ? "pb-24" : "pb-8"}`}
    >
      {children}
    </div>
  );
}
