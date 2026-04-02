import type { PropsWithChildren } from "react";

import { ThemeToggle } from "./ThemeToggle";

export const AppHeader = ({ children }: PropsWithChildren) => (
  <header className="topbar">
    <div className="brand">
      <span className="brand__mark">▣</span>
      <span className="brand__text">TERMINAL_POKER</span>
    </div>
    <div className="topbar__meta">
      {children}
      <ThemeToggle />
    </div>
  </header>
);
