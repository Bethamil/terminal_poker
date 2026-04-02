import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export const SelectField = ({ children, hint, label, ...props }: SelectFieldProps) => (
  <label className="field">
    <span className="field__label">{label}</span>
    <select className="field__input field__select" {...props}>
      {children}
    </select>
    {hint ? <span className="field__hint">{hint}</span> : null}
  </label>
);
