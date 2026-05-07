import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { getApplicationType } from "@/lib/application-utils";
import type { getCategoryMeta, localizeJob } from "@/lib/jobs";

type JobItem = {
  job: ReturnType<typeof localizeJob>;
  meta: ReturnType<typeof getCategoryMeta>;
};

function formatDue(dateStr: string | null | undefined, locale: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale === "cs" ? "cs-CZ" : "sk-SK");
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function JobCard({ job, meta, locale, headingLevel = "h3", favoriteButton }: JobItem & { locale: string; headingLevel?: "h2" | "h3"; favoriteButton?: ReactNode }) {
  const due = formatDue(job.applicationDue, locale);
  const Heading = headingLevel;
  const appType = getApplicationType(job.applicationUrl ?? null);
  const isCs = locale === "cs";

  return (
    <Link
      href={{ pathname: "/prace/[slug]", params: { slug: job.slug } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
    >
      {/* Top accent */}
      <div className={`h-1 w-full flex-shrink-0 ${meta.accentClass}`} />

      {favoriteButton}

      <div className="flex flex-1 flex-col p-5">
        {/* Category badge */}
        <span className={`mb-3 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
          {meta.icon} {meta.label}
        </span>

        {/* Title */}
        <Heading className="mb-1 text-base font-bold leading-snug text-[var(--color-text)] line-clamp-2">
          {job.title}
        </Heading>

        {/* Location */}
        {job.location && (
          <p className="text-sm text-[var(--color-text-muted)] truncate">
            📍 {job.location}
          </p>
        )}

        {/* Bottom row */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {job.engagementType && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>
                {job.engagementType}
              </span>
            )}
            {appType === "portal" && (
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                {isCs ? "Přes portál" : "Cez portál"}
              </span>
            )}
            {due && (
              <span className="text-xs text-[var(--color-text-muted)]">
                do {due}
              </span>
            )}
          </div>

          {/* Chevron */}
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200
              group-hover:translate-x-0.5 group-hover:shadow-sm ${meta.arrowClass}`}
          >
            <ChevronRight />
          </div>
        </div>
      </div>
    </Link>
  );
}
