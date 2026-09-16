import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface JobTranslations {
  title_cs: string;
  title_sk: string;
  description_cs: string;
  description_sk: string;
  requires_norwegian: boolean;
  includes_accommodation: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  work_start: string | null;
  work_end: string | null;
}

const SYSTEM_BASE = `You process Norwegian job ads for a Czech/Slovak job portal. Return the result by calling the process_job tool.

Fields:
- includes_accommodation: boolean — SET TRUE if the employer provides housing/accommodation as part of the offer. Look for: "losji", "bolig", "hybel", "overnatting inkludert", "innkvartering", "boplass", "husvære", "kost og losji", "vi tilbyr bolig", "bolig tilbys", "gratis bolig", "bolig er inkludert", "bolig på stedet", "firmahytte", "brakke". SET FALSE if accommodation is NOT mentioned or is only available for a fee without employer subsidy.
- requires_norwegian: boolean — Decision rule:
  SET TRUE if Norwegian proficiency is explicitly required: "kreves norsk", "må beherske norsk", "norsk i tale og skrift", "flytende norsk", "gode norskkunnskaper", "kommunikasjon på norsk", "snakke norsk", "forstå norsk". Also TRUE if Norwegian is primary AND English is only a bonus joined by "og gjerne", "og helst", "og fortrinnsvis" (e.g. "norsk og gjerne engelsk" = Norwegian is required, English is a bonus).
  SET FALSE only if (a) English alone is sufficient — explicit "eller" alternatives: "norsk eller engelsk", "norsk or english", "engelsk eller norsk", "norsk/engelsk" meaning EITHER language works; OR (b) Norwegian is only an advantage with no mandatory requirement: "fordel", "ønskelig", "pluss", "en fordel", "er ønskelig", "er en fordel".
  KEY DISTINCTION: "og" (and) = Norwegian required even if English also mentioned. "eller" (or) = either language works = false.
- title_cs: Czech job title. Write as a native Czech speaker would — a natural Czech job position name. Do NOT include the company name.
- title_sk: Same into Slovak.
- description_cs: Translate as a professional copywriter writing a Czech job ad. RULES:
  Do NOT translate word-for-word — preserve meaning but adapt to Czech job ad conventions.
  Use informal "ty" address ("Hledáme tě", "Budeš mít na starosti", "Co ti nabízíme") — this is the modern Czech standard.
  Map common Norwegian phrases: "vi søker" → "Hledáme", "vi tilbyr" → "Co nabízíme", "arbeidsoppgaver" → "Náplň práce", "kvalifikasjoner/krav" → "Požadujeme", "Om oss" → "O nás".
  Format as clean HTML: <p> for paragraphs, <ul><li> for bullet lists (requirements, responsibilities, benefits), <strong> for section headings. No <h1>/<h2>.
  Avoid stiff phrases like "Je požadováno aby...", "Uchazeč musí být...", "Pozice zahrnuje...". Write engagingly.
  Strip ALL: contact names, emails, phone numbers, "kontakt:", "send CV to:", company name (provided as "Company"), all URLs.
- description_sk: Same into Slovak with identical rules. Use Slovak informal address ("Hľadáme ťa", "Budeš mať na starosti", "Čo ti ponúkame").
- work_start: when the job starts, YYYY-MM-DD, resolved relative to "Today" in the message. Explicit date → that date. Only a month ("fra oktober") → first day of its next occurrence. "snarest"/"straks"/ASAP/"etter avtale"/permanent position → Today. Season only: summer ("sommersesong", "sommerjobb") → June 1; winter ("vintersesong", "sesongen 2026/2027") → December 1 (next occurrence). null if the ad gives no hint at all.
- work_end: when the job ends, YYYY-MM-DD. Only a month ("ut august", "til slutten av mai") → last day of that month. Summer season → August 31; winter season → April 30 of the following year. null for permanent/open-ended positions or when unknown.
- Never invent dates: if the ad says nothing about timing, both work_start and work_end are null.`;

const SYSTEM_WITH_CONTACT_EXTRACTION = SYSTEM_BASE + `
- contact_name: full name of the contact person extracted from the description, or null
- contact_email: email address extracted from the description, or null
- contact_phone: phone number extracted from the description, or null`;

const SYSTEM_WITH_KNOWN_CONTACTS = SYSTEM_BASE + `
- contact_name: null (contacts provided separately)
- contact_email: null (contacts provided separately)
- contact_phone: null (contacts provided separately)`;

// Výsledek přes vynucený nástroj se strict schématem: SDK vrací už rozparsovaný objekt.
// (Dřív volný JSON text — neescapované uvozovky v HTML popisu shazovaly ~5 % překladů.)
const PROCESS_JOB_TOOL: Anthropic.Tool = {
  name: "process_job",
  description: "Uloží zpracovaný (přeložený) inzerát.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      title_cs: { type: "string" },
      title_sk: { type: "string" },
      description_cs: { type: "string" },
      description_sk: { type: "string" },
      requires_norwegian: { type: "boolean" },
      includes_accommodation: { type: "boolean" },
      contact_name: { type: ["string", "null"] },
      contact_email: { type: ["string", "null"] },
      contact_phone: { type: ["string", "null"] },
      work_start: { type: ["string", "null"] },
      work_end: { type: ["string", "null"] },
    },
    required: [
      "title_cs", "title_sk", "description_cs", "description_sk",
      "requires_norwegian", "includes_accommodation",
      "contact_name", "contact_email", "contact_phone",
      "work_start", "work_end",
    ],
    additionalProperties: false,
  },
};

async function processJob(
  title: string,
  description: string,
  company: string,
  knownContacts: ContactInfo | null
): Promise<JobTranslations> {
  const system = knownContacts ? SYSTEM_WITH_KNOWN_CONTACTS : SYSTEM_WITH_CONTACT_EXTRACTION;

  let userContent = `Today: ${new Date().toISOString().slice(0, 10)}\nCompany: ${company}\nTitle: ${title}\n\nDescription: ${description}`;
  if (knownContacts) {
    const parts = [
      knownContacts.name,
      knownContacts.email,
      knownContacts.phone,
    ].filter(Boolean);
    if (parts.length > 0) {
      userContent += `\n\nKnown contacts to STRIP from translation: ${parts.join(", ")}`;
    }
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system,
    tools: [PROCESS_JOB_TOOL],
    tool_choice: { type: "tool", name: "process_job" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  // max_tokens = uříznutý výstup → neúplný překlad, radši selhat (translateBatch zkusí znovu)
  if (!toolUse || message.stop_reason === "max_tokens") {
    throw new Error(`Claude: chybí výsledek process_job (stop_reason ${message.stop_reason})`);
  }
  const result = { ...(toolUse.input as JobTranslations) };

  // Regex fallback — strip any URLs Claude may have missed
  const stripUrls = (s: string | null) =>
    s ? s.replace(/https?:\/\/[^\s"'<>]+/gi, "").replace(/www\.[^\s"'<>]+/gi, "").trim() : s;
  result.description_cs = stripUrls(result.description_cs) ?? result.description_cs;
  result.description_sk = stripUrls(result.description_sk) ?? result.description_sk;

  // Termín: jen platné YYYY-MM-DD; konec před začátkem = nesmysl → bez konce
  const validDate = (d: string | null | undefined) =>
    d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime()) ? d : null;
  result.work_start = validDate(result.work_start);
  result.work_end = validDate(result.work_end);
  if (result.work_start && result.work_end && result.work_end < result.work_start) result.work_end = null;

  // If contacts came from NAV API, override whatever Claude returned
  if (knownContacts) {
    result.contact_name = knownContacts.name;
    result.contact_email = knownContacts.email;
    result.contact_phone = knownContacts.phone;
  }

  // Secondary safety-net: catch Norwegian requirements missed in claude's flag
  if (!result.requires_norwegian && czechTextRequiresNorwegian(result.description_cs ?? "")) {
    result.requires_norwegian = true;
  }

  // Regex safety-net for accommodation (catches obvious cases even if Claude misses)
  if (!result.includes_accommodation && norwegianTextIncludesAccommodation(description)) {
    result.includes_accommodation = true;
  }

  return result;
}

// Regex check on Czech translation — no AI needed, catches common missed cases
function czechTextRequiresNorwegian(czechText: string): boolean {
  const t = czechText.toLowerCase();
  const bonusPatterns = [
    /norština\s+(je\s+)?(výhoda|plus|vítána|výhodou)/,
    /norsky\s+(je\s+)?(výhoda|plus|vítán)/,
    /znalost\s+norštiny\s+(je\s+)?(výhod|vítán|plus)/,
    /norštině?\s+(nebo|či)\s+anglič/,
    /anglič\S*\s+(nebo|či)\s+norš/,
  ];
  if (bonusPatterns.some((p) => p.test(t))) return false;

  const requiredPatterns = [
    /znalost\s+norštiny/,
    /plynná?\s+norština/,
    /plynně?\s+norsky/,
    /plynnou?\s+norštinu/,
    /komunikace\s+v\s+norštině/,
    /komunikovat\s+v\s+norštině/,
    /norštiny\s+(v\s+)?(písemné|mluvené|ústní|psané|mluveném|písemném)/,
    /norštiny\s+na\s+úrovni/,
    /musí(š|te)?\s+(ovládat|mluvit|umět|rozumět)\s+norsky/,
    /norštinu\s+(je\s+)?(nutné|nutno|povinné|třeba)\s+ovládat/,
    /norský\s+jazyk\s+(je\s+)?(nutný|povinný|požadován|vyžadován)/,
    /norštiny\b.{0,40}(nutnost|podmínka)/,
  ];
  return requiredPatterns.some((p) => p.test(t));
}

function norwegianTextIncludesAccommodation(text: string): boolean {
  const t = text.toLowerCase();

  // Negative patterns — explicitly deny accommodation or it's the workplace, not staff housing
  const negatives = [
    /tilbyr\s+dessverre\s+ikke\s+(overnatting|bolig|losji)/,
    /ikke\s+(tilbyr|inkludert)\s+(bolig|losji|overnatting)/,
    /boligen\s+tilbyr\s+heldøgns/,   // care home — bolig is the facility, not staff housing
    /tilgang\s+til\s+firmahytter/,    // company holiday cabins as perk ≠ on-site accommodation
  ];
  if (negatives.some((p) => p.test(t))) return false;

  return [
    /\blosji\b/,
    /\binnkvartering\b/,
    /\bboplass\b/,
    /\bhusvære\b/,
    /kost\s+og\s+losji/,
    /bolig\s+(tilbys|inkludert|er\s+inkludert|på\s+stedet)/,
    /vi\s+tilbyr\s+bolig/,
    /gratis\s+bolig/,
    /personalbolig/,
    /\bfirmahytte\b/,  // word boundary — won't match "firmahytter"
    /\bbrakke\b/,
    /hybel\s+tilbys/,
  ].some((p) => p.test(t));
}

// Process up to CONCURRENCY jobs in parallel
const CONCURRENCY = 8;

const MAX_ATTEMPTS = 3;

// null = překlad se nepodařil ani po opakování → volající inzerát NEUKLÁDÁ
// (dřív se ukládal prázdný titulek/popis a requires_norwegian: false).
export async function translateBatch(
  items: Array<{ title: string; description: string; company?: string; contactList?: Array<{ name?: string; email?: string; phone?: string }> }>
): Promise<(JobTranslations | null)[]> {
  if (items.length === 0) return [];

  const results: (JobTranslations | null)[] = new Array(items.length).fill(null);

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (item) => {
        const knownContacts = extractContactFromList(item.contactList);
        for (let attempt = 1; ; attempt++) {
          try {
            return await processJob(item.title, item.description, item.company ?? "", knownContacts);
          } catch (err) {
            if (attempt >= MAX_ATTEMPTS) throw err;
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
      })
    );
    chunkResults.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results[i + j] = r.value;
      } else {
        console.error(`translateBatch item failed (${MAX_ATTEMPTS}×):`, r.reason?.message ?? r.reason);
      }
    });
  }

  return results;
}

function extractContactFromList(
  contactList?: Array<{ name?: string; email?: string; phone?: string }>
): ContactInfo | null {
  if (!contactList || contactList.length === 0) return null;
  // Prefer the first entry that has email or phone
  const best = contactList.find((c) => c.email || c.phone) ?? contactList[0];
  const name = best.name?.trim() || null;
  const email = best.email?.trim() || null;
  const phone = best.phone?.trim() || null;
  if (!name && !email && !phone) return null;
  return { name, email, phone };
}
