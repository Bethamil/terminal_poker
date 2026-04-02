import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

const labelClasses =
  "font-['JetBrains_Mono'] text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--muted)]";

const inputClasses =
  "w-full rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--input-bg)] px-4 py-[0.9rem] text-[color:var(--text)] transition-[border-color,background,box-shadow] duration-150 placeholder:text-[color:var(--input-placeholder)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-3 focus:ring-[rgba(135,245,197,0.12)] disabled:opacity-60";

export const Field = ({ className = "", hint, label, ...props }: FieldProps) => (
  <label className="grid gap-[0.45rem]">
    {label ? <span className={labelClasses}>{label}</span> : null}
    <input className={[inputClasses, className].filter(Boolean).join(" ")} {...props} />
    {hint ? <span className={labelClasses}>{hint}</span> : null}
  </label>
);
