import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostika nasazení: nasazený commit + které proměnné prostředí jsou nastavené.
// Vrací jen true/false, nikdy hodnoty. Chráněno stejným tajemstvím jako cron.
const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_FOUNDING",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "ANTHROPIC_API_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
];

export async function GET(request: NextRequest) {
  const secret =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ??
    request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env: Object.fromEntries(KEYS.map((k) => [k, Boolean(process.env[k])])),
    stripeMode: key.startsWith("sk_live") ? "live" : key.startsWith("sk_test") ? "test" : null,
  });
}
