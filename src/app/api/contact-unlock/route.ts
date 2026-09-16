import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getEntitlement, hasPremium, FREE_CONTACT_LIMIT } from "@/lib/entitlement";

export const runtime = "nodejs";

// Odemkne kontakt inzerátu z bezplatného limitu. Limit se hlídá tady (service role),
// ne v klientovi — RLS na contact_unlocks běžnému uživateli zápis nepovolí.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { jobId } = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "Chybí inzerát" }, { status: 400 });
  }

  const ent = await getEntitlement(user.id);
  if (hasPremium(ent)) return NextResponse.json({ ok: true, remaining: null });

  const admin = supabaseAdmin();
  const { data: rows, error } = await admin
    .from("contact_unlocks")
    .select("job_id")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Chyba databáze" }, { status: 500 });

  // Už odemčený inzerát limit znovu nečerpá
  if (rows.some((r) => r.job_id === jobId)) {
    return NextResponse.json({ ok: true, remaining: Math.max(0, FREE_CONTACT_LIMIT - rows.length) });
  }
  if (rows.length >= FREE_CONTACT_LIMIT) {
    return NextResponse.json({ error: "limit", remaining: 0 }, { status: 403 });
  }

  // jen živý inzerát (aktivní a nevypršelý) — za prošlý kontakt limit nečerpat
  const { data: job } = await admin
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Inzerát nenalezen" }, { status: 404 });

  const { error: insertError } = await admin
    .from("contact_unlocks")
    .insert({ user_id: user.id, job_id: jobId });
  // 23505 = souběžný dvojklik už řádek vložil — výsledek je stejný
  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: "Chyba databáze" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, remaining: FREE_CONTACT_LIMIT - rows.length - 1 });
}
