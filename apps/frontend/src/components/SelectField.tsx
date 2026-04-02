import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

const labelClasses =
  "font-['JetBrains_Mono'] text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--muted)]";

const selectClasses =
  "w-full appearance-none rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--input-bg)] px-4 py-[0.9rem] text-[color:var(--text)] transition-[border-color,background,box-shadow] duration-150 focus:border-[color:var(--primary)] focus:outline-none focus:ring-3 focus:ring-[rgba(135,245,197,0.12)] disabled:opacity-60";

export const SelectField = ({
  children,
  className = "",
  hint,
  label,
  ...props
}: SelectFieldProps) => (
  <label className="grid gap-[0.45rem]">
    <span className={labelClasses}>{label}</span>
    <select className={[selectClasses, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </select>
    {hint ? <span className={labelClasses}>{hint}</span> : null}
  </label>
);
