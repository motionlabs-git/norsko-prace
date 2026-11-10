import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { DOCUMENTS_BUCKET } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

/** Jen správce — kontrola proti profilu, ne proti údaji z prohlížeče. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nepovoleno" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const access = form.get("access") === "all" ? "all" : "premium";

  if (!(file instanceof File)) return NextResponse.json({ error: "Chybí soubor" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Chybí název" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Nahraj PDF" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Soubor je větší než 25 MB" }, { status: 400 });

  const slug = slugify(title) || `dokument-${Date.now()}`;
  // Čas v názvu souboru: nahrání nové verze nepřepíše starou v mezipaměti CDN
  const filePath = `${slug}/${Date.now()}.pdf`;
  const db = supabaseAdmin();

  const upload = await db.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, await file.arrayBuffer(), { contentType: "application/pdf", upsert: true });
  if (upload.error) {
    return NextResponse.json({ error: `Nahrání selhalo: ${upload.error.message}` }, { status: 500 });
  }

  const { error } = await db.from("documents").upsert(
    {
      slug,
      title,
      description: description || null,
      file_path: filePath,
      access,
      size_bytes: file.size,
      is_published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) return NextResponse.json({ error: `Uložení selhalo: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, slug, access, size: file.size });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nepovoleno" }, { status: 403 });

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Chybí slug" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: doc } = await db.from("documents").select("file_path").eq("slug", slug).maybeSingle();
  if (doc?.file_path) await db.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path]);
  const { error } = await db.from("documents").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
