import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { AppModal } from "./AppModal";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";

export const AppHeader = ({
  actions,
  brandAside,
  children,
  mobileMenu
}: PropsWithChildren<{
  actions?: ReactNode;
  brandAside?: ReactNode;
  mobileMenu?: {
    label: string;
    title: string;
    triggerLabel?: string;
    renderContent: (closeMenu: () => void) => ReactNode;
  };
}>) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className={`topbar ${mobileMenu ? "topbar--mobile-menu-enabled" : ""}`.trim()}>
        <Link aria-label="Go to homepage" className="brand" to="/">
          <span className="brand__mark">&gt;_</span>
          <span className="brand__text">TERMINAL_POKER</span>
          {brandAside ? <div className="brand__aside">{brandAside}</div> : null}
        </Link>
        <div className="topbar__center">{children}</div>
        <div className="topbar__actions">
          {actions ? <div className="topbar__actions-group">{actions}</div> : null}
          <div className="topbar__theme-slot">
            <ThemeToggle />
          </div>
          {mobileMenu ? (
            <Button
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
              className="topbar__mobile-menu-trigger"
              onClick={() => setIsMobileMenuOpen(true)}
              variant="ghost"
            >
              {mobileMenu.triggerLabel ?? "MENU"}
            </Button>
          ) : null}
        </div>
      </header>

      {mobileMenu && isMobileMenuOpen ? (
        <AppModal
          label={mobileMenu.label}
          onClose={closeMobileMenu}
          title={mobileMenu.title}
          titleId="mobile-header-menu-title"
        >
          <div className="mobile-menu">
            {mobileMenu.renderContent(closeMobileMenu)}
            <div className="mobile-menu__theme">
              <ThemeToggle />
            </div>
          </div>
        </AppModal>
      ) : null}
    </>
  );
};
