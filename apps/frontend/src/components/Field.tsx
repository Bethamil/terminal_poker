import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const Field = ({ hint, label, ...props }: FieldProps) => (
  <label className="field">
    <span className="field__label">{label}</span>
    <span className="field__prompt">&gt;</span>
    <input className="field__input" {...props} />
    {hint ? <span className="field__hint">{hint}</span> : null}
  </label>
);

