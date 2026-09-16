import Stripe from "stripe";

// apiVersion záměrně neuvádíme → použije se verze zabudovaná v SDK.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  typescript: true,
});

// Tarify → Stripe price IDs (nastav ve Stripe dashboardu, doplň do .env.local).
export const PRICE_IDS = {
  premium: process.env.STRIPE_PRICE_PREMIUM ?? "",
  premium_plus: process.env.STRIPE_PRICE_PREMIUM_PLUS ?? "",
  founding: process.env.STRIPE_PRICE_FOUNDING ?? "",
} as const;

export type PlanKey = keyof typeof PRICE_IDS;

// Který DB tier daná cena odemyká. Founding = stejný přístup jako Premium, jen levnější zamčená cena.
export function priceIdToTier(priceId: string): "premium" | "premium_plus" | null {
  if (!priceId) return null;
  if (priceId === PRICE_IDS.premium || priceId === PRICE_IDS.founding) return "premium";
  if (priceId === PRICE_IDS.premium_plus) return "premium_plus";
  return null;
}
