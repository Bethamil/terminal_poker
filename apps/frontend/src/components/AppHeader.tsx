import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "./ThemeToggle";

export const AppHeader = ({
  actions,
  brandAside,
  children
}: PropsWithChildren<{
  actions?: ReactNode;
  brandAside?: ReactNode;
}>) => (
  <header className="topbar">
    <Link aria-label="Go to homepage" className="brand" to="/">
      <span className="brand__mark">▣</span>
      <span className="brand__text">TERMINAL_POKER</span>
      {brandAside ? <div className="brand__aside">{brandAside}</div> : null}
    </Link>
    <div className="topbar__center">{children}</div>
    <div className="topbar__actions">
      {actions}
      <ThemeToggle />
    </div>
  </header>
);
