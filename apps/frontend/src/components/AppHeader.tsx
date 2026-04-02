import type { PropsWithChildren, ReactNode } from "react";

import { ThemeToggle } from "./ThemeToggle";

export const AppHeader = ({
  actions,
  children
}: PropsWithChildren<{
  actions?: ReactNode;
}>) => (
  <header className="topbar">
    <div className="brand">
      <span className="brand__mark">▣</span>
      <span className="brand__text">TERMINAL_POKER</span>
    </div>
    <div className="topbar__center">{children}</div>
    <div className="topbar__actions">
      {actions}
      <ThemeToggle />
    </div>
  </header>
);
