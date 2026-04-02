import type { ReactNode } from "react";

interface StatusChipProps {
  children: ReactNode;
  tone?: "default" | "accent" | "success";
}

const toneClasses: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  default: "border-[color:var(--outline)] bg-[color:var(--chip-bg)] text-[color:var(--text)]",
  accent: "border-[color:var(--outline)] [background:var(--chip-accent-bg)] text-[color:var(--primary)]",
  success: "border-[color:var(--outline)] bg-[color:var(--success-bg)] text-[color:var(--success)]"
};

export const StatusChip = ({ children, tone = "default" }: StatusChipProps) => (
  <span
    className={[
      "inline-flex w-fit min-w-[4.75rem] items-center justify-center gap-[0.35rem] self-start whitespace-nowrap rounded-full border px-[0.58rem] py-[0.24rem] font-['JetBrains_Mono'] text-[0.68rem] leading-none uppercase tracking-[0.12em]",
      toneClasses[tone]
    ].join(" ")}
  >
    {children}
  </span>
);
