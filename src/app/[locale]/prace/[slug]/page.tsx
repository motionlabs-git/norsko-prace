import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getJobBySlug, localizeJob, getCategoryMeta, translateSector, getSimilarJobs, getUserFavoriteIds } from "@/lib/jobs";
import { getApplicationType } from "@/lib/application-utils";
import { SimilarJobsSlider } from "@/components/jobs/SimilarJobsSlider";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";
import type { Locale } from "@/types";


export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return {};
  const localized = localizeJob(job, locale as Locale);
  const isCs = locale === "cs";

  const titleSuffix = localized.location
    ? ` — ${localized.location}, Norsko`
    : " — Norsko";
  const title = `${localized.title}${titleSuffix} | Norsko-práce.cz`;

  const plainDesc = localized.description?.replace(/<[^>]+>/g, "").trim() ?? "";
  const firstSentence = plainDesc.split(/[.!?]/)[0]?.trim().slice(0, 130) ?? "";
  const description = isCs
    ? `Sezónní práce: ${firstSentence}. Přihlaste se přímo u zaměstnavatele.`
    : `Sezónna práca: ${firstSentence}. Prihláste sa priamo u zamestnávateľa.`;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: "article",
    },
    alternates: {
      canonical: `https://norsko-prace.cz/${locale}/prace/${slug}`,
      languages: {
        cs: `https://norsko-prace.cz/cs/prace/${slug}`,
        sk: `https://norsko-prace.cz/sk/prace/${slug}`,
      },
    },
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const localized = localizeJob(job, locale as Locale);
  const meta = getCategoryMeta(job.category_level1);
  const isCs = locale === "cs";
  const appType = getApplicationType(localized.applicationUrl ?? null);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const favoriteIds = user ? await getUserFavoriteIds(user.id) : [];
  const isFavorited = favoriteIds.includes(job.id);

  const similarRaw = await getSimilarJobs(job.id, job.category_level1);
  const similarItems = similarRaw.map(j => ({
    job: localizeJob(j, locale as Locale),
    meta: getCategoryMeta(j.category_level1),
  }));

  const translateApplicationDue = (
    due: string,
    cs: boolean,
    fmt: (d: string | null) => string | null
  ) => {
    const lower = due.toLowerCase().trim();
    if (lower === "snarest" || lower === "snarest mulig" || lower === "fortløpende") {
      return cs ? "Co nejdříve" : "Čo najskôr";
    }
    return fmt(due) ?? due;
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/[\s\-(). ]/g, "");
    const withCode = cleaned.startsWith("+") ? cleaned : `+47${cleaned}`;
    const digits = withCode.replace("+47", "");
    const display = digits.length === 8
      ? `+47 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`
      : withCode;
    return { display, tel: withCode };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(locale === "cs" ? "cs-CZ" : "sk-SK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: localized.title,
            description: localized.description?.replace(/<[^>]+>/g, "").slice(0, 500),
            hiringOrganization: {
              "@type": "Organization",
              name: "Norská firma",
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: job.location_city ?? "",
                addressRegion: job.location_county ?? "",
                addressCountry: "NO",
              },
            },
            employmentType: job.engagement_type ?? "",
            datePosted: job.published_at ?? "",
            validThrough: job.expires_at ?? "",
            url: localized.applicationUrl ?? localized.sourceUrl ?? "",
          }),
        }}
      />

      {/* Breadcrumb + header */}
      <section
        className="py-10"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
            <Link href="/prace" className="hover:text-white">
              {isCs ? "Nabídky" : "Ponuky"}
            </Link>
            <span>/</span>
            <span className="text-white/80">{localized.title}</span>
          </div>

          <span
            className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
          >
            {meta.icon} {meta.label}
          </span>

          <h1 className="text-2xl font-extrabold leading-tight text-white md:text-3xl">
            {localized.title}
          </h1>

          {localized.location && (
            <p className="mt-1 text-white/60">
              📍{" "}
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(localized.location + ", Norway")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white hover:underline transition-colors"
              >
                {localized.location}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Body */}
      <section className="bg-[var(--color-bg)] py-10">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            {/* Description */}
            <div>
              <div
                className="prose prose-sm max-w-none text-[var(--color-text)] [&_a]:text-[var(--color-primary)] [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{
                  __html: localized.description ?? "",
                }}
              />

            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Apply CTA */}
              {localized.applicationUrl && (
                <div className="space-y-2">
                  <a
                    href={localized.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-full bg-[var(--color-primary)] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
                  >
                    {isCs ? "Přihlásit se →" : "Prihlásiť sa →"}
                  </a>
                  {appType === "portal" && (
                    <p className="text-center text-xs text-[var(--color-text-muted)]">
                      {isCs ? "Přihláška přes pracovní portál" : "Prihláška cez pracovný portál"}
                    </p>
                  )}
                </div>
              )}

              {/* Favorite */}
              {user && (
                <FavoriteButton
                  jobId={job.id}
                  initialFavorited={isFavorited}
                  variant="detail"
                  locale={locale}
                />
              )}

              {/* Contact box */}
              {(job.contact_name || job.contact_email || job.contact_phone) && (
                <div className="rounded-2xl bg-white p-5 shadow-(--shadow-sm)">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-(--color-text-muted)">
                    {isCs ? "Kontakt" : "Kontakt"}
                  </h3>
                  {job.contact_name && (
                    <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">{job.contact_name}</p>
                  )}
                  {job.contact_email && (
                    <a
                      href={`mailto:${job.contact_email}`}
                      className="block text-sm text-(--color-primary) hover:underline"
                    >
                      {job.contact_email}
                    </a>
                  )}
                  {job.contact_phone && (() => {
                    const { display, tel } = formatPhone(job.contact_phone);
                    return (
                      <a
                        href={`tel:${tel}`}
                        className="mt-1 block text-sm text-(--color-primary) hover:underline"
                      >
                        {display}
                      </a>
                    );
                  })()}
                </div>
              )}

              {/* Details card */}
              <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-sm)]">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {isCs ? "Informace o pozici" : "Informácie o pozícii"}
                </h3>
                <dl className="space-y-3 text-sm">
                  {localized.engagementType && (
                    <DetailRow
                      label={isCs ? "Typ" : "Typ"}
                      value={localized.engagementType}
                    />
                  )}
                  {localized.extent && (
                    <DetailRow
                      label={isCs ? "Rozsah" : "Rozsah"}
                      value={localized.extent}
                    />
                  )}
                  {job.position_count && (
                    <DetailRow
                      label={isCs ? "Počet míst" : "Počet miest"}
                      value={String(job.position_count)}
                    />
                  )}
                  {localized.applicationDue && (
                    <DetailRow
                      label={isCs ? "Přihlásit do" : "Prihlásiť do"}
                      value={translateApplicationDue(localized.applicationDue, isCs, formatDate)}
                      highlight
                    />
                  )}
                  {localized.publishedAt && (
                    <DetailRow
                      label={isCs ? "Zveřejněno" : "Zverejnené"}
                      value={formatDate(localized.publishedAt) ?? localized.publishedAt}
                    />
                  )}
                </dl>
              </div>

              {/* Back link */}
              <Link
                href="/prace"
                className="block text-center text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              >
                ← {isCs ? "Zpět na přehled" : "Späť na prehľad"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SimilarJobsSlider
        items={similarItems}
        locale={locale}
        label={isCs ? "Podobné pozice" : "Podobné pozície"}
      />
    </>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd
        className={`text-right font-semibold ${
          highlight ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
