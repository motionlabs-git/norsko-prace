import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className = "", hover, padding = "md" }: CardProps) {
  return (
    <div
      className={[
        "bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]",
        "shadow-[var(--shadow-sm)]",
        hover
          ? "transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
          : "",
        paddingStyles[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
