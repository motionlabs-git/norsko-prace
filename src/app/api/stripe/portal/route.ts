import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "Žádné předplatné" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/profil`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Nejčastěji: v ostrém režimu není aktivovaný zákaznický portál
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe portal selhal:", message);
    return NextResponse.json({ error: "Portál se nepodařilo otevřít", detail: message.slice(0, 200) }, { status: 500 });
  }
}
