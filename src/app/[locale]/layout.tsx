import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { createClient } from "@/utils/supabase/server";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isCs = locale === "cs";
  return {
    metadataBase: new URL("https://norsko-prace.cz"),
    title: {
      default: isCs
        ? "Práce v Norsku česky | Sezónní nabídky — Norsko-práce.cz"
        : "Práca v Nórsku po slovensky | Sezónne ponuky — Norsko-práce.cz",
      template: "%s | Norsko-práce.cz",
    },
    description: isCs
      ? "Stovky sezónních pracovních nabídek z Norska přeložených do češtiny. Zemědělství, gastronomie, stavebnictví — aktualizováno denně."
      : "Stovky sezónnych pracovných ponúk z Nórska preložených do slovenčiny. Poľnohospodárstvo, gastronómia, stavebníctvo — aktualizované denne.",
    openGraph: {
      type: "website",
      locale: isCs ? "cs_CZ" : "sk_SK",
      siteName: "Norsko-práce.cz",
      images: [{ url: "/images/hero.jpg", width: 1920, height: 1440, alt: "Práce v Norsku" }],
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical: `https://norsko-prace.cz/${locale}`,
      languages: {
        cs: "https://norsko-prace.cz/cs",
        sk: "https://norsko-prace.cz/sk",
        "x-default": "https://norsko-prace.cz/cs",
      },
    },
  };
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "cs" | "sk")) {
    notFound();
  }

  const messages = await getMessages();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: string | null = null;
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "user";
    fullName = profile?.full_name ?? null;
  }

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} user={user ? { email: user.email ?? "", fullName, role } : null} />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
