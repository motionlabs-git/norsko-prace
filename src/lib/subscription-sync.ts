import { stripe, priceIdToTier } from "./stripe";
import { supabaseAdmin } from "./supabase";

const ACTIVE_STATUSES = ["active", "trialing"];

// Záchrana, když nedorazí (nebo selže) webhook: stav předplatného dotáhne přímo ze Stripe.
// Vrací true, když je předplatné aktivní. Volá se po návratu z checkoutu, ne při každém načtení.
export async function reconcileSubscription(userId: string, email?: string | null): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  let customerId: string | undefined = row?.stripe_customer_id ?? undefined;
  if (!customerId && email) {
    const found = await stripe.customers.list({ email, limit: 1 });
    customerId = found.data[0]?.id;
  }
  if (!customerId) return false;

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 5 });
  const sub = subs.data.find((s) => ACTIVE_STATUSES.includes(s.status)) ?? subs.data[0];
  if (!sub) return false;

  const priceId = sub.items.data[0]?.price?.id ?? "";
  const item = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
  const periodEnd =
    item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      status: sub.status,
      tier: priceIdToTier(priceId),
      price_id: priceId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return ACTIVE_STATUSES.includes(sub.status);
}
