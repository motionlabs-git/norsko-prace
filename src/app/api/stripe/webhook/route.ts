import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, priceIdToTier } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail, welcomeEmail, cancellationEmail, type EmailMessage } from "@/lib/email";

export const runtime = "nodejs";

const ACTIVE_STATUSES = ["active", "trialing"];

export async function POST(request: NextRequest) {
  const body = await request.text(); // raw body kvůli ověření podpisu
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Chybí podpis/secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "neznámá";
    console.error("Stripe webhook ověření selhalo:", msg);
    return NextResponse.json({ error: "Neplatný podpis" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  async function syncSubscription(sub: Stripe.Subscription) {
    const priceId = sub.items.data[0]?.price?.id ?? "";
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    // current_period_end je unix (s). Od API 2026-08-26 sedí na položce subscriptionu,
    // starší verze ho měly na subscriptionu samotném — čteme obě varianty.
    const item = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
    const periodEnd =
      item?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end;

    const row = {
      status: sub.status,
      tier: priceIdToTier(priceId),
      price_id: priceId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    // Předchozí stav — k rozpoznání změny (e-mail o zrušení posíláme jen jednou)
    const { data: prev } = await admin
      .from("subscriptions")
      .select("user_id, cancel_at_period_end")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    const metaUserId = sub.metadata?.user_id;
    if (metaUserId) {
      await admin.from("subscriptions").upsert({ user_id: metaUserId, ...row }, { onConflict: "user_id" });
    } else {
      // fallback: napároj podle zákazníka
      await admin.from("subscriptions").update(row).eq("stripe_customer_id", customerId);
    }

    return { userId: metaUserId ?? (prev?.user_id as string | undefined), prev, row };
  }

  // E-mail nesmí shodit webhook — Stripe by event opakoval a zákazník by dostal duplicity
  async function notify(userId: string, build: (to: string) => EmailMessage) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      const to = data.user?.email;
      if (to) await sendEmail(build(to));
    } catch (err) {
      console.error("Stripe webhook e-mail selhal:", err instanceof Error ? err.message : err);
    }
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated": {
        const { userId, prev, row } = await syncSubscription(event.data.object as Stripe.Subscription);
        // Zrušeno v portálu (přístup do konce období) → potvrzení, jen při změně stavu
        if (userId && row.cancel_at_period_end && !prev?.cancel_at_period_end && ACTIVE_STATUSES.includes(row.status)) {
          await notify(userId, (to) => cancellationEmail(to, row.current_period_end));
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const { userId, row } = await syncSubscription(sub);
          // Poděkování jen odsud (1× za nákup) — subscription.created chodí souběžně
          const buyer = userId ?? session.client_reference_id ?? undefined;
          if (buyer && ACTIVE_STATUSES.includes(row.status)) {
            await notify(buyer, (to) => welcomeEmail(to, row.tier));
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook zpracování selhalo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Chyba zpracování" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
