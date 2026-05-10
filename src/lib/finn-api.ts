/**
 * Finn.no job scraper
 * Phase 1: collect job IDs from search results HTML (no auth needed)
 * Phase 2: fetch detail pages, extract JSON-LD + contact info
 * Only keeps jobs that have at least one contact method (email or phone).
 */

const FINN_BASE = "https://www.finn.no";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

const SEASONAL_QUERIES = ["sesong", "sommerjobb", "feriejobb", "sommervikariat"];
const SEASONAL_INDUSTRIES = [3, 4, 14, 16, 17, 26, 34, 46];
const MAX_IDS = 300;      // IDs to collect from search
const SEARCH_CONCURRENCY = 5;
const DETAIL_CONCURRENCY = 6;

export interface FinnJob {
  finnId: string;
  title: string;
  description: string;
  company: string | null;
  locationCity: string | null;
  datePosted: string | null;
  validThrough: string | null;
  employmentType: string | null;
  sourceUrl: string;
  applicationUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Finn ${res.status} ${url}`);
  return res.text();
}

// ── Phase 1: collect IDs from search pages ────────────────────────────────────

function extractJobIds(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/finn\.no\/job\/ad\/(\d+)/g)) ids.add(m[1]);
  return [...ids];
}

async function collectIds(): Promise<string[]> {
  const allIds = new Set<string>();
  const urls: string[] = [];

  for (const q of SEASONAL_QUERIES) {
    for (let p = 1; p <= 4; p++)
      urls.push(`${FINN_BASE}/job/search?q=${encodeURIComponent(q)}&sort=PUBLISHED_DESC&page=${p}`);
  }
  for (const ind of SEASONAL_INDUSTRIES) {
    for (let p = 1; p <= 2; p++)
      urls.push(`${FINN_BASE}/job/search?industry=${ind}&sort=PUBLISHED_DESC&page=${p}`);
  }

  for (let i = 0; i < urls.length; i += SEARCH_CONCURRENCY) {
    if (allIds.size >= MAX_IDS) break;
    const results = await Promise.allSettled(urls.slice(i, i + SEARCH_CONCURRENCY).map(fetchHtml));
    for (const r of results) {
      if (r.status === "fulfilled") extractJobIds(r.value).forEach((id) => allIds.add(id));
    }
  }

  console.log(`Finn: collected ${allIds.size} IDs from ${urls.length} search pages`);
  return [...allIds].slice(0, MAX_IDS);
}

// ── Phase 2: parse detail page ────────────────────────────────────────────────

const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
// Norwegian mobile/landline: +47XXXXXXXX or 8 digits starting with 4-9
const PHONE_RE = /(?:\+47[\s.-]?)?(?:[4-9]\d{3}[\s.-]?\d{4}|\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2})/g;
const SKIP_EMAILS = new Set(["finn.no", "schema.org", "google", "apple", "sentry", "woff"]);

function extractEmails(html: string): string[] {
  const found: string[] = [];
  for (const m of html.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    if (!SKIP_EMAILS.has(email.split("@")[1]?.split(".")[0] ?? "")) found.push(email);
  }
  return [...new Set(found)];
}

function extractPhones(html: string): string[] {
  // Strip HTML tags/attributes first so we don't match Apple app-id or other attribute values
  const text = html.replace(/<[^>]*>/g, " ");
  const found: string[] = [];
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length === 8 || (digits.length === 10 && digits.startsWith("47"))) found.push(m[0].trim());
  }
  return [...new Set(found)].slice(0, 3);
}

function parseJsonLd(html: string): Partial<FinnJob> | null {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      let d = JSON.parse(m[1]);
      // Finn.no wraps JSON-LD: {"script:ld+json": {actual data}}
      if (d["script:ld+json"]) d = d["script:ld+json"];
      if (d["@type"] !== "JobPosting") continue;

      const loc = d.jobLocation?.address ?? {};
      const org = d.hiringOrganization ?? {};
      const empTypes: string[] = Array.isArray(d.employmentType) ? d.employmentType : d.employmentType ? [d.employmentType] : [];
      const finnId = (d.url ?? "").match(/\/(\d+)$/)?.[1] ?? "";
      const rawDesc = (d.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      return {
        finnId,
        title: d.title ?? "",
        description: rawDesc.slice(0, 2000),
        company: org.name ?? null,
        locationCity: loc.addressLocality ?? null,
        datePosted: d.datePosted ?? null,
        validThrough: d.validThrough ?? null,
        employmentType: empTypes[0] ?? null,
        sourceUrl: finnId ? `${FINN_BASE}/job/ad/${finnId}` : "",
        applicationUrl: finnId ? `${FINN_BASE}/job/ad/${finnId}` : null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchDetail(finnId: string): Promise<FinnJob | null> {
  try {
    const html = await fetchHtml(`${FINN_BASE}/job/ad/${finnId}`);
    const structured = parseJsonLd(html);

    const emails = extractEmails(html);
    const phones = extractPhones(html);

    // Require structured data with a title — no JSON-LD means we can't display meaningful content
    if (!structured?.title) return null;

    // Require at least one contact method
    if (emails.length === 0 && phones.length === 0) return null;

    const base = structured;

    return {
      finnId,
      title: base.title ?? "",
      description: base.description ?? "",
      company: base.company ?? null,
      locationCity: base.locationCity ?? null,
      datePosted: base.datePosted ?? null,
      validThrough: base.validThrough ?? null,
      employmentType: base.employmentType ?? null,
      sourceUrl: `${FINN_BASE}/job/ad/${finnId}`,
      applicationUrl: `${FINN_BASE}/job/ad/${finnId}`,
      contactEmail: emails[0] ?? null,
      contactPhone: phones[0] ?? null,
      contactName: null,
    };
  } catch {
    return null;
  }
}

function sanitize(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/[«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ── Main iterator ─────────────────────────────────────────────────────────────

export async function iterateFinnFeed(
  onBatch: (jobs: FinnJob[]) => Promise<void>
): Promise<{ fetched: number; withContact: number }> {
  const ids = await collectIds();

  let fetched = 0;
  let withContact = 0;
  const BATCH_SIZE = 15;
  const batch: FinnJob[] = [];

  for (let i = 0; i < ids.length; i += DETAIL_CONCURRENCY) {
    const chunk = ids.slice(i, i + DETAIL_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(fetchDetail));

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;
      fetched++;
      const job = r.value;
      job.title = sanitize(job.title);
      job.description = sanitize(job.description);
      if (job.company) job.company = sanitize(job.company);
      withContact++;
      batch.push(job);

      if (batch.length >= BATCH_SIZE) {
        await onBatch(batch.splice(0, BATCH_SIZE));
      }
    }
  }

  if (batch.length > 0) await onBatch(batch);

  console.log(`Finn: ${fetched} detail pages fetched, ${withContact} with contact`);
  return { fetched, withContact };
}
