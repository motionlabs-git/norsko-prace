import Link from "next/link";

export function getPaginationRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);
  const range: (number | null)[] = [1];
  if (left > 2) range.push(null);
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push(null);
  range.push(total);
  return range;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (p: number) => string;
}) {
  const range = getPaginationRange(page, totalPages);
  const btnBase =
    "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";
  const linkClass = `${btnBase} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]`;
  const disabledClass = `${btnBase} border border-[var(--color-border)] text-[var(--color-border)] cursor-not-allowed`;

  return (
    <div className="mt-12 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={linkClass} aria-label="Předchozí stránka">←</Link>
      ) : (
        <span className={disabledClass}>←</span>
      )}
      {range.map((p, i) =>
        p === null ? (
          <span key={`e-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-[var(--color-text-muted)]">…</span>
        ) : p === page ? (
          <span key={p} className={`${btnBase} bg-[var(--color-primary)] text-white cursor-default`}>{p}</span>
        ) : (
          <Link key={p} href={buildHref(p)} className={linkClass}>{p}</Link>
        )
      )}
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={linkClass} aria-label="Další stránka">→</Link>
      ) : (
        <span className={disabledClass}>→</span>
      )}
    </div>
  );
}
