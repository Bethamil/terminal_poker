import type { ReactNode } from "react";

import { RepoFooterLink } from "./RepoFooterLink";

export const AppFooter = ({
  center,
  centerClassName,
  left,
  leftClassName,
  right,
  rightClassName
}: {
  center?: ReactNode;
  centerClassName?: string;
  left?: ReactNode;
  leftClassName?: string;
  right?: ReactNode;
  rightClassName?: string;
}) => (
  <footer
    className="app-footer z-20 flex h-10 items-center justify-between px-4 font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.16em] backdrop-blur-xl"
    style={{
      background: "var(--shell-footer-bg)",
      borderTop: "1px solid var(--shell-footer-border)",
      color: "var(--shell-footer-text)"
    }}
  >
    <div className={["flex items-center", leftClassName].filter(Boolean).join(" ")}>{left}</div>
    <div className={["flex items-center", centerClassName].filter(Boolean).join(" ")}>{center}</div>
    <div className={["flex items-center", rightClassName].filter(Boolean).join(" ")}>
      {right ?? <RepoFooterLink />}
    </div>
  </footer>
);
