import type { ComponentProps, ReactNode } from "react";

import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  variant: "landing" | "room";
  header?: ComponentProps<typeof AppHeader>;
  footer?: ComponentProps<typeof AppFooter>;
  main: ReactNode;
  mainClassName?: string;
  className?: string;
  overlay?: ReactNode;
}

export const AppLayout = ({
  className,
  footer,
  header,
  main,
  mainClassName,
  overlay,
  variant
}: AppLayoutProps) => (
  <div className={["shell", `shell--${variant}`, className].filter(Boolean).join(" ")}>
    {header ? <AppHeader {...header} /> : null}
    <main className={mainClassName}>{main}</main>
    {footer ? <AppFooter {...footer} /> : null}
    {overlay}
  </div>
);
