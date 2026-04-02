import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  stretch?: boolean;
}

export const Button = ({
  children,
  className = "",
  stretch = false,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) => (
  <button
    className={`button button--${variant} ${stretch ? "button--stretch" : ""} ${className}`.trim()}
    type={props.type ?? "button"}
    {...props}
  >
    {children}
  </button>
);
