import Link from "next/link";
import type { ReactNode } from "react";
import type { Job } from "@/types";
import { localizeJob, getCategoryMeta, DEFAULT_CATEGORY } from "@/lib/jobs";
import { getTrade } from "@/lib/trades";
import { JobCard } from "./JobCard";
import { Pagination } from "./Pagination";

/** Karta stálé pozice se barví podle oboru, ne podle NAV kategorie. */
function cardMeta(job: Job) {
  const trade = getTrade(job.trade);
  if (!trade) return getCategoryMeta(job.category_level1);
  return {
    ...DEFAULT_CATEGORY,
    label: trade.label,
    icon: trade.icon,
    badgeClass: trade.badgeClass,
    accentClass: trade.accentClass,
    arrowClass: `${trade.accentClass} text-white`,
  };
}

interface Props {
  jobs: Job[];
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  /** Vykreslí tlačítko oblíbených u karty (jen pro přihlášené) */
  renderFavorite?: (jobId: string) => ReactNode;
  emptyTitle: string;
  emptyHint?: string;
  resetHref?: string;
}

export function JobResults({
  jobs,
  page,
  totalPages,
  buildHref,
  renderFavorite,
  emptyTitle,
  emptyHint,
  resetHref,
}: Props) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
        <p className="text-lg text-[var(--color-text-muted)]">{emptyTitle}</p>
        {emptyHint && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{emptyHint}</p>}
        {resetHref && (
          <Link
            href={resetHref}
            className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            Zrušit filtry →
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={localizeJob(job)}
            meta={cardMeta(job)}
            headingLevel="h2"
            favoriteButton={renderFavorite?.(job.id)}
          />
        ))}
      </div>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />}
    </>
  );
}
