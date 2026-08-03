import type { ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

const styles: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:bg-rose-dark",
  secondary: "bg-transparent text-ink border border-ink/70 hover:border-ink hover:bg-ink hover:text-cream",
  ghost: "bg-blush text-rose-dark hover:bg-rose-light",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-200 whitespace-nowrap";

export function LinkButton({
  to,
  variant = "primary",
  className = "",
  children,
}: CommonProps & { to: string }) {
  return (
    <Link to={to} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
