"use client";

import { useState } from "react";
import { track, AnalyticsEvent } from "@/lib/analytics";

export function CheckoutButton({
  plan,
  children,
  className = "",
}: {
  plan: "premium" | "premium_plus" | "founding";
  children: React.ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    track(AnalyticsEvent.CheckoutStarted, { plan });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/login?next=/premium";
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        alert(data.error ?? "Něco se pokazilo, zkus to prosím znovu.");
      }
    } catch {
      setLoading(false);
      alert("Něco se pokazilo, zkus to prosím znovu.");
    }
  }

  return (
    <button type="button" onClick={go} disabled={loading} className={`cursor-pointer disabled:opacity-60 ${className}`}>
      {loading ? "Přesměrovávám…" : children}
    </button>
  );
}
