import type { ReactNode } from "react";

interface StatusChipProps {
  children: ReactNode;
  tone?: "default" | "accent" | "success";
}

export const StatusChip = ({ children, tone = "default" }: StatusChipProps) => (
  <span className={`status-chip status-chip--${tone}`}>{children}</span>
);
