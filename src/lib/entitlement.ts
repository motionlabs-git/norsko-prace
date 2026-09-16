import { createServerSupabase } from "./supabase";

// Uživatelský nárok (předplatné). Nezaměňovat s jobs.is_premium (= AI-skórované inzeráty).
export type Tier = "free" | "premium" | "premium_plus";

export interface Entitlement {
  tier: Tier;
  active: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const FREE: Entitlement = {
  tier: "free",
  active: false,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const ACTIVE_STATUSES = ["active", "trialing"];

export async function getEntitlement(userId: string | null | undefined): Promise<Entitlement> {
  if (!userId) return FREE;
  const db = await createServerSupabase();
  const { data } = await db
    .from("subscriptions")
    .select("status, tier, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return FREE;

  const notExpired =
    !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now();
  const active = ACTIVE_STATUSES.includes(data.status ?? "") && notExpired;

  return {
    tier: active ? ((data.tier as Tier) ?? "free") : "free",
    active,
    status: data.status ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  };
}

/** Má přístup k Premium (Premium i Premium Plus). */
export function hasPremium(e: Entitlement): boolean {
  return e.active && (e.tier === "premium" || e.tier === "premium_plus");
}

/** Má přístup k Premium Plus (průvodce/kurz, support). */
export function hasPremiumPlus(e: Entitlement): boolean {
  return e.active && e.tier === "premium_plus";
}

/** Kolik kontaktů si může přihlášený neplatící uživatel zdarma odemknout. */
export const FREE_CONTACT_LIMIT = 10;

export interface ContactAccess {
  canSee: boolean; // kontakt tohoto inzerátu je vidět (Premium nebo odemčeno zdarma)
  unlocked: boolean; // odemčeno z bezplatného limitu
  used: number;
  remaining: number;
}

/** Přístup ke kontaktu. Bez jobId vrátí jen čerpání limitu (např. pro profil). */
export async function getContactAccess(
  userId: string | null | undefined,
  ent: Entitlement,
  jobId?: string,
): Promise<ContactAccess> {
  const none = { canSee: false, unlocked: false, used: 0, remaining: FREE_CONTACT_LIMIT };
  if (hasPremium(ent)) return { ...none, canSee: true };
  if (!userId) return none;

  const db = await createServerSupabase();
  const { data } = await db.from("contact_unlocks").select("job_id").eq("user_id", userId);
  if (!data) return none; // tabulka zatím neexistuje → chováme se jako nevyčerpaný limit

  const unlocked = jobId ? data.some((r) => r.job_id === jobId) : false;
  return {
    canSee: unlocked,
    unlocked,
    used: data.length,
    remaining: Math.max(0, FREE_CONTACT_LIMIT - data.length),
  };
}
