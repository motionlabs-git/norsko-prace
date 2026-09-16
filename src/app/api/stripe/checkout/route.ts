import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe, PRICE_IDS, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { plan } = (await request.json().catch(() => ({}))) as { plan?: PlanKey };
  // Zatím prodáváme jen Founding Premium (ostatní tarify, až budou mít co nabídnout)
  const SELLABLE: PlanKey[] = ["founding"];
  const priceId = plan && SELLABLE.includes(plan) ? PRICE_IDS[plan] : "";
  if (!priceId) return NextResponse.json({ error: "Neplatný tarif" }, { status: 400 });

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;
  const admin = supabaseAdmin();

  // Najít / vytvořit Stripe zákazníka
  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id ?? undefined;
  // Uložený zákazník z jiného režimu (test vs. live) nebo smazaný → založ nového
  if (customerId) {
    const found = await stripe.customers.retrieve(customerId).catch(() => null);
    if (!found || found.deleted) customerId = undefined;
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  // Stripe Tax (EU DPH) zapneme až po nastavení v dashboardu → env přepínač,
  // aby první testovací checkout neselhal na chybějící daňové konfiguraci.
  const taxEnabled = process.env.STRIPE_AUTOMATIC_TAX === "true";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    // Účtovat vždy v CZK — bez přepočtu do měny zákazníka (Stripe „adaptive pricing")
    adaptive_pricing: { enabled: false },
    ...(taxEnabled
      ? { automatic_tax: { enabled: true }, customer_update: { address: "auto" as const } }
      : {}),
    success_url: `${origin}/profil?checkout=success`,
    cancel_url: `${origin}/premium?checkout=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
