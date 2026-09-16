"use client";

import { useState } from "react";

export function ManageSubscriptionButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        alert(data.error ?? "Něco se pokazilo.");
      }
    } catch {
      setLoading(false);
      alert("Něco se pokazilo.");
    }
  }

  return (
    <button type="button" onClick={go} disabled={loading} className={`cursor-pointer disabled:opacity-60 ${className}`}>
      {loading ? "Otevírám…" : "Spravovat předplatné"}
    </button>
  );
}
