/**
 * Dokumenty ke stažení (e-book, návody, checklisty).
 *
 * Soubory jsou v soukromém bucketu `documents`. Ven jde vždy jen krátkodobý
 * podepsaný odkaz, který server vydá až po kontrole oprávnění — kdo nemá Premium,
 * nedostane ani odkaz, natož soubor.
 */
import { createServerSupabase, supabaseAdmin } from "./supabase";
import { hasPremium, type Entitlement } from "./entitlement";
import type { DocumentRow } from "./document-types";

export type { DocumentAccess, DocumentRow } from "./document-types";
export { formatSize } from "./document-types";

export const DOCUMENTS_BUCKET = "documents";
/** Platnost podepsaného odkazu; krátká schválně, aby se nedal přeposlat dál. */
const SIGNED_URL_TTL_SECONDS = 120;

/** Seznam zveřejněných dokumentů (metadata, bez cest k souborům). */
export async function listDocuments(): Promise<DocumentRow[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("documents")
    .select("id, slug, title, description, file_path, access, size_bytes, sort_order, created_at")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    // Dokud není spuštěná migrace, stránka má jen zůstat bez dokumentů
    console.error("listDocuments:", error.message);
    return [];
  }
  return (data ?? []) as DocumentRow[];
}

/** Smí tenhle uživatel dokument stáhnout? */
export function canDownload(doc: Pick<DocumentRow, "access">, ent: Entitlement, signedIn: boolean): boolean {
  if (!signedIn) return false;
  return doc.access === "all" || hasPremium(ent);
}

export async function getDocumentBySlug(slug: string): Promise<DocumentRow | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("documents")
    .select("id, slug, title, description, file_path, access, size_bytes, sort_order, created_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as DocumentRow | null) ?? null;
}

/** Podepsaný odkaz ke stažení. Volat až po kontrole oprávnění. */
export async function createSignedDownload(filePath: string, fileName: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS, { download: fileName });

  if (error) {
    console.error("createSignedDownload:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
