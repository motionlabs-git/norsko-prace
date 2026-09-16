import posthog from "posthog-js";

// Centralizované názvy eventů, ať se nerozjíždí. Volat z klientských komponent.
// (Pageviews + kliknutí řeší PostHog autocapture; tohle jsou důležité vlastní eventy.)
export const AnalyticsEvent = {
  ApplyClick: "apply_click", // klik na přihlášení/kontakt (hlavní konverze)
  ContactPaywallView: "contact_paywall_view", // zobrazen paywall na kontakt
  ContactUnlocked: "contact_unlocked", // odemčen kontakt z bezplatného limitu
  ContactLimitReached: "contact_limit_reached", // pokus o odemčení po vyčerpání limitu
  UpgradeCtaClicked: "upgrade_cta_clicked", // klik na "Premium"/upgrade
  CheckoutStarted: "checkout_started",
  FavoriteAdded: "favorite_added",
  FilterUsed: "filter_used",
  Search: "search", // hledání podle klíčových slov v přehledu
  Signup: "signup",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export function track(event: AnalyticsEventName, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, props);
}
