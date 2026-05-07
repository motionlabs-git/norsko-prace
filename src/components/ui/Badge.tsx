import type { ReactNode } from "react";

type BadgeVariant = "primary" | "accent" | "muted" | "success";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  accent: "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
  muted: "bg-[var(--color-border)] text-[var(--color-text-muted)]",
  success: "bg-green-50 text-green-700",
};

export function Badge({ variant = "muted", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variantStyles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
