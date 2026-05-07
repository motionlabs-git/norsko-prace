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
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

const SYSTEM_BASE = `You process Norwegian job ads for a Czech/Slovak job portal. For each job return a single JSON object — no markdown, no commentary, only raw JSON.

Required keys:
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
- description_sk: Same into Slovak with identical rules. Use Slovak informal address ("Hľadáme ťa", "Budeš mať na starosti", "Čo ti ponúkame").`;

const SYSTEM_WITH_CONTACT_EXTRACTION = SYSTEM_BASE + `
- contact_name: full name of the contact person extracted from the description, or null
- contact_email: email address extracted from the description, or null
- contact_phone: phone number extracted from the description, or null`;

const SYSTEM_WITH_KNOWN_CONTACTS = SYSTEM_BASE + `
- contact_name: null (contacts provided separately)
- contact_email: null (contacts provided separately)
- contact_phone: null (contacts provided separately)`;

async function processJob(
  title: string,
  description: string,
  company: string,
  knownContacts: ContactInfo | null
): Promise<JobTranslations> {
  const system = knownContacts ? SYSTEM_WITH_KNOWN_CONTACTS : SYSTEM_WITH_CONTACT_EXTRACTION;

  let userContent = `Company: ${company}\nTitle: ${title}\n\nDescription: ${description}`;
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
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  let result: JobTranslations;
  try {
    result = JSON.parse(text) as JobTranslations;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) result = JSON.parse(match[0]) as JobTranslations;
    else throw new Error(`Claude response parse failed: ${text.slice(0, 200)}`);
  }

  // Regex fallback — strip any URLs Claude may have missed
  const stripUrls = (s: string | null) =>
    s ? s.replace(/https?:\/\/[^\s"'<>]+/gi, "").replace(/www\.[^\s"'<>]+/gi, "").trim() : s;
  result.description_cs = stripUrls(result.description_cs) ?? result.description_cs;
  result.description_sk = stripUrls(result.description_sk) ?? result.description_sk;

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

// Process up to CONCURRENCY jobs in parallel
const CONCURRENCY = 8;

export async function translateBatch(
  items: Array<{ title: string; description: string; company?: string; contactList?: Array<{ name?: string; email?: string; phone?: string }> }>
): Promise<JobTranslations[]> {
  if (items.length === 0) return [];

  const results: JobTranslations[] = new Array(items.length);

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((item) => {
        const knownContacts = extractContactFromList(item.contactList);
        return processJob(item.title, item.description, item.company ?? "", knownContacts);
      })
    );
    chunkResults.forEach((r, j) => {
      results[i + j] = r;
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
