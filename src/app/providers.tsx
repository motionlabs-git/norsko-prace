"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect, useState } from "react";
import { PostHogPageview } from "@/components/analytics/PostHogPageview";
import { ConsentBanner } from "@/components/ui/ConsentBanner";

type PHUser = { distinctId: string; email: string } | null;
type Consent = "granted" | "denied" | "unset";

let initialized = false;

export function PostHogProvider({ children, user }: { children: React.ReactNode; user: PHUser }) {
  const [consent, setConsent] = useState<Consent>("unset");

  // Inicializace PostHogu (jednou) + načtení uloženého souhlasu.
  // opt_out_capturing_by_default = nic se neodesílá, dokud uživatel nesouhlasí.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key && !initialized) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        ui_host: "https://eu.posthog.com",
        capture_pageview: false, // řešíme ručně v PostHogPageview
        capture_pageleave: true,
        autocapture: true,
        persistence: "localStorage+cookie",
        opt_out_capturing_by_default: true,
      });
      initialized = true;
    }
    const saved = localStorage.getItem("ph_consent");
    setConsent(saved === "granted" || saved === "denied" ? saved : "unset");
  }, []);

  // Aplikace souhlasu + identifikace přihlášeného uživatele.
  useEffect(() => {
    if (!initialized) return;
    if (consent === "granted") {
      posthog.opt_in_capturing();
      if (user) posthog.identify(user.distinctId, { email: user.email });
    } else if (consent === "denied") {
      posthog.opt_out_capturing();
    }
  }, [consent, user]);

  const handleChoice = (choice: "granted" | "denied") => {
    localStorage.setItem("ph_consent", choice);
    setConsent(choice);
  };

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
      {consent === "unset" && <ConsentBanner onChoice={handleChoice} />}
    </PHProvider>
  );
}
