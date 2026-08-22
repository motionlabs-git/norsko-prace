import { notFound } from "next/navigation";
import Link from "next/link";
import { getJobBySlug, localizeJob, getCategoryMeta, translateSector, getSimilarJobs, getUserFavoriteIds } from "@/lib/jobs";
import { buildBreadcrumb } from "@/lib/seo";
import { getApplicationType } from "@/lib/application-utils";
import { SimilarJobsSlider } from "@/components/jobs/SimilarJobsSlider";
import { FavoriteButton } from "@/components/jobs/FavoriteButton";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return {};
  const localized = localizeJob(job);
  const titleSuffix = localized.location ? ` — ${localized.location}, Norsko` : " — Norsko";
  const title = `${localized.title}${titleSuffix} | Norsko-práce.cz`;
  const plainDesc = localized.description?.replace(/<[^>]+>/g, "").trim() ?? "";
  const firstSentence = plainDesc.split(/[.!?]/)[0]?.trim().slice(0, 130) ?? "";
  const description = `Sezónní práce: ${firstSentence}. Přihlaste se přímo u zaměstnavatele.`;
  return {
    title,
    description: description.slice(0, 160),
    openGraph: { title, description: description.slice(0, 160), type: "article" },
    alternates: { canonical: `https://norsko-prace.cz/prace/${slug}` },
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const localized = localizeJob(job);
  const meta = getCategoryMeta(job.category_level1);
  const appType = getApplicationType(localized.applicationUrl ?? null);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const favoriteIds = user ? await getUserFavoriteIds(user.id) : [];
  const isFavorited = favoriteIds.includes(job.id);

  const similarRaw = await getSimilarJobs(job.id, job.category_level1);
  const similarItems = similarRaw.map(j => ({ job: localizeJob(j), meta: getCategoryMeta(j.category_level1) }));

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
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  };

  const translateApplicationDue = (due: string, dueAt: string | null) => {
    const lower = due.toLowerCase().trim();
    if (lower === "snarest" || lower === "snarest mulig" || lower === "fortløpende") return "Co nejdříve";
    // Preferuj normalizované datum (raw text může být DD.MM.YYYY, které new Date() misparsuje)
    return formatDate(dueAt) ?? formatDate(due) ?? due;
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: localized.title,
            description: localized.description?.replace(/<[^>]+>/g, "").slice(0, 500),
            hiringOrganization: { "@type": "Organization", name: job.company ?? "Norská firma" },
            jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location_city ?? "", addressRegion: job.location_county ?? "", addressCountry: "NO" } },
            employmentType: job.engagement_type ?? "",
            datePosted: job.published_at ?? "",
            validThrough: job.expires_at ?? "",
            url: localized.applicationUrl ?? localized.sourceUrl ?? "",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumb([
            { name: "Nabídky práce", url: "https://norsko-prace.cz/prace" },
            { name: localized.title, url: `https://norsko-prace.cz/prace/${slug}` },
          ])),
        }}
      />

      <section className="py-10" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
            <Link href="/prace" className="hover:text-white">Nabídky</Link>
            <span>/</span>
            <span className="text-white/80">{localized.title}</span>
          </div>
          <span className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
            {meta.icon} {meta.label}
          </span>
          <h1 className="text-2xl font-extrabold leading-tight text-white md:text-3xl">{localized.title}</h1>
          {localized.location && (
            <p className="mt-1 text-white/60">
              📍{" "}
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(localized.location + ", Norway")}`} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors">
                {localized.location}
              </a>
            </p>
          )}
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-10">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              <div
                className="prose prose-sm max-w-none text-[var(--color-text)] [&_a]:text-[var(--color-primary)] [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: localized.description ?? "" }}
              />
            </div>

            <div className="space-y-4">
              {localized.applicationUrl && (
                <div className="space-y-2">
                  <a href={localized.applicationUrl} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full bg-[var(--color-primary)] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]">
                    Přihlásit se →
                  </a>
                  {appType === "portal" && (
                    <p className="text-center text-xs text-[var(--color-text-muted)]">Přihláška přes pracovní portál</p>
                  )}
                </div>
              )}

              {user && <FavoriteButton jobId={job.id} initialFavorited={isFavorited} variant="detail" />}

              {(job.contact_name || job.contact_email || job.contact_phone) && (
                <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-sm)]">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Kontakt</h3>
                  {job.contact_name && <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">{job.contact_name}</p>}
                  {job.contact_email && <a href={`mailto:${job.contact_email}`} className="block text-sm text-[var(--color-primary)] hover:underline">{job.contact_email}</a>}
                  {job.contact_phone && (() => {
                    const { display, tel } = formatPhone(job.contact_phone);
                    return <a href={`tel:${tel}`} className="mt-1 block text-sm text-[var(--color-primary)] hover:underline">{display}</a>;
                  })()}
                </div>
              )}

              <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-sm)]">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Informace o pozici</h3>
                <dl className="space-y-3 text-sm">
                  {localized.engagementType && <DetailRow label="Typ" value={localized.engagementType} />}
                  {localized.extent && <DetailRow label="Rozsah" value={localized.extent} />}
                  {job.position_count && <DetailRow label="Počet míst" value={String(job.position_count)} />}
                  {localized.applicationDue && <DetailRow label="Přihlásit do" value={translateApplicationDue(localized.applicationDue, localized.applicationDueAt)} highlight />}
                  {localized.publishedAt && <DetailRow label="Zveřejněno" value={formatDate(localized.publishedAt) ?? localized.publishedAt} />}
                  {job.sector && <DetailRow label="Sektor" value={translateSector(job.sector) ?? job.sector} />}
                </dl>
              </div>

              <Link href="/prace" className="block text-center text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                ← Zpět na přehled
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SimilarJobsSlider items={similarItems} label="Podobné pozice" />
    </>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`text-right font-semibold ${highlight ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"}`}>{value}</dd>
    </div>
  );
}
