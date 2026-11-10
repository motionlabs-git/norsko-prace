import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getEntitlement } from "@/lib/entitlement";
import { canDownload, createSignedDownload, getDocumentBySlug } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stažení dokumentu. Oprávnění se kontroluje tady na serveru — odkaz v prohlížeči
 * vede vždy sem, nikdy přímo do úložiště.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/login?next=/profil`, request.url));
  }

  const doc = await getDocumentBySlug(slug);
  if (!doc) return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });

  const ent = await getEntitlement(user.id);
  if (!canDownload(doc, ent, true)) {
    return NextResponse.redirect(new URL("/premium?from=dokumenty", request.url));
  }

  const fileName = `${slug}.pdf`;
  const url = await createSignedDownload(doc.file_path, fileName);
  if (!url) return NextResponse.json({ error: "Soubor se nepodařilo připravit" }, { status: 500 });

  return NextResponse.redirect(url);
}
